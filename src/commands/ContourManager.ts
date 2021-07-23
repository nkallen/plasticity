import { SequentialExecutor } from '../util/Executor';
import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from "../editor/EditorSignals";
import { GeometryDatabase } from '../editor/GeometryDatabase';
import * as visual from "../editor/VisualModel";

// and we need to aggregate by placement

class CurveInfo {
    touched = new Set<visual.SpaceInstance<visual.Curve3D>>();
    fragments = new Array<visual.Item>();
    constructor(readonly planarCurve: c3d.Curve) { }
}

type Curve2dId = bigint;
type Trim = { trimmed: c3d.Curve, start: number, stop: number };

export default class ContourManager extends SequentialExecutor<void> {
    private readonly curve2info = new Map<visual.SpaceInstance<visual.Curve3D>, CurveInfo>();
    private readonly planar2instance = new Map<Curve2dId, visual.SpaceInstance<visual.Curve3D>>();

    constructor(
        private readonly db: GeometryDatabase,
        signals: EditorSignals
    ) {
        super();

        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);

        signals.userAddedCurve.add(this.add);
        signals.userRemovedCurve.add(this.remove);
    }

    async add(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        await this.enqueue(() => this._add(newCurve));
    }

    async remove(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        await this.enqueue(() => this._remove(newCurve));
    }

    private async _remove(curve: visual.SpaceInstance<visual.Curve3D>, invalidateCurvesThatTouch = true) {
        const { curve2info, planar2instance } = this;
        const info = curve2info.get(curve);
        if (info === undefined) return;
        curve2info.delete(curve);

        const { touched, fragments, planarCurve } = info;

        planar2instance.delete(planarCurve.Id());

        for (const fragment of fragments) {
            this.db.removeItem(fragment);
        }

        if (invalidateCurvesThatTouch) { // mutually touching curves form a circular graph so do a bfs
            const visited = new Set<visual.SpaceInstance<visual.Curve3D>>();
            let walk = [...touched];
            while (walk.length > 0) {
                const touchee = walk.pop()!;
                if (visited.has(touchee)) continue;
                visited.add(touchee);
                if (curve2info.has(touchee)) { // we may have already deleted this as part of the recursive process
                    walk = walk.concat([...curve2info.get(touchee)!.touched]);
                }
            }

            for (const touchee of visited) {
                await this._remove(touchee, false);
            }

            visited.delete(curve);

            for (const touchee of visited) {
                await this._add(touchee);
            }
        }
    }

    private async _add(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        const { curve2info, planar2instance } = this;

        const newPlanarCurve = this.curve3d2curve2d(newCurve);
        if (newPlanarCurve === undefined) return;
        const info = new CurveInfo(newPlanarCurve);
        curve2info.set(newCurve, info);
        planar2instance.set(newPlanarCurve.Id(), newCurve);

        const allPlanarCurves = [...curve2info.values()].map(info => info.planarCurve);
        if (allPlanarCurves.length < 2) return;

        const curvesToProcess = new Map<Curve2dId, c3d.Curve>();
        curvesToProcess.set(newPlanarCurve.Id(), newPlanarCurve);
        const visited = new Set<Curve2dId>();

        const promises = [];
        for (const [id, current] of curvesToProcess) {
            visited.add(id);
            curvesToProcess.delete(id);

            const crosses = c3d.CurveEnvelope.IntersectWithAll(current, allPlanarCurves, true);
            if (crosses.length < 1) continue;
            crosses.sort((a, b) => {
                return a.on1.t - b.on1.t;
            });

            // For bounded (finite) open curves (like line segments), we need to add in the beginning and end points
            if (current.IsBounded() && !current.IsClosed()) {
                const begPointOn = new c3d.PointOnCurve(current.GetTMin(), current);
                const begCrossPoint = new c3d.CrossPoint(current.GetLimitPoint(1), begPointOn, begPointOn);
                crosses.unshift(begCrossPoint);

                const endPointOn = new c3d.PointOnCurve(current.GetTMax(), current);
                const endCrossPoint = new c3d.CrossPoint(current.GetLimitPoint(2), endPointOn, endPointOn);
                crosses.push(endCrossPoint);
            } else if (current.IsClosed()) { // And for closed/looping curves we need to add a point
                crosses.push(crosses[0]);
            }

            // The crosses (intersections) are sorted, so each t[i] (start) to t[i+1] (stop) section of the curve is a cuttable.
            const first = crosses.shift()!;
            let start = first.on1.t;
            const result: Trim[] = [];
            for (const cross of crosses) {
                const { on1: { t, curve }, on2: { curve: other } } = cross;
                const otherId = other.Id();

                info.touched.add(this.planar2instance.get(otherId)!);

                const stop = t;
                if (Math.abs(start - stop) < 10e-6) { start = stop; continue }
                const trimmed = curve.Trimmed(start, stop, 1)!;
                result.push({ trimmed, start, stop });
                start = stop;

                if (!visited.has(otherId)) {
                    curvesToProcess.set(otherId, other);
                }
            }
            promises.push(this.updateCurve(this.planar2instance.get(id)!, result));
        }
        await Promise.all(promises);
    }


    private async updateCurve(instance: visual.SpaceInstance<visual.Curve3D>, result: Trim[]) {
        const { curve2info, db } = this;
        const info = curve2info.get(instance)!;
        for (const invalid of info.fragments) {
            db.removeItem(invalid, 'automatic');
        }
        const placement = new c3d.Placement3D();
        const views: visual.Item[] = [];
        const ps = [];
        for (const { trimmed, start, stop } of result) {
            const inst = new c3d.SpaceInstance(new c3d.PlaneCurve(placement, trimmed, true));
            const p = db.addItem(inst, 'automatic').then(item => {
                item.layers.set(visual.Layers.CurveFragment);
                item.traverse(c => c.layers.set(visual.Layers.CurveFragment));
                item.userData.start = start;
                item.userData.stop = stop;
                item.userData.parentItem = instance;
                views.push(item);
            });
            ps.push(p);
        }
        await Promise.all(ps);
        info.fragments = views;
    }

    private curve3d2curve2d(from: visual.SpaceInstance<visual.Curve3D>) {
        const { db } = this;

        const placement_ = new c3d.Placement3D();
        const inst = db.lookup(from);
        const item = inst.GetSpaceItem()!;

        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        try {
            const { curve2d, placement } = curve.GetPlaneCurve(true, new c3d.PlanarCheckParams(0.1));

            // Apply an 2d placement to the curve, so that any future booleans work
            const matrix = placement.GetMatrixToPlace(placement_);
            curve2d.Transform(matrix);

            return curve2d;
        } catch (e) {
            console.warn(e);
        }
    }
}
