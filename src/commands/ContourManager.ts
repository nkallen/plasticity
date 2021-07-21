import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from "../editor/Editor";
import { GeometryDatabase } from '../editor/GeometryDatabase';
import * as visual from "../editor/VisualModel";

export default class ContourManager {
    private readonly allFragments = new Set<visual.Item>();
    private readonly curve2fragments = new Map<bigint, visual.Item[]>();

    constructor(
        private readonly db: GeometryDatabase,
        signals: EditorSignals
    ) {
        signals.contoursChanged.add(c => this.update(c));
    }

    async update(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        const { db } = this;
        // const regions = db.find(visual.PlaneInstance) as visual.PlaneInstance<visual.Region>[];
        // for (const region of regions) db.removeItem(region);

        const allCurves = db.find(visual.SpaceInstance) as visual.SpaceInstance<visual.Curve3D>[];

        const newPlanarCurve = this.curve3d2curve(newCurve);
        if (newPlanarCurve === undefined) return;

        const allPlanarCurves = [];
        for (const curve3d of allCurves) {
            if (curve3d === newCurve) {
                allPlanarCurves.push(newPlanarCurve);
                continue;
            }
            const curve = this.curve3d2curve(curve3d);
            if (curve === undefined) continue;
            allPlanarCurves.push(curve);
        }
        if (allPlanarCurves.length < 2) return;

        const curvesToProcess = new Map<bigint, c3d.Curve>();
        curvesToProcess.set(newPlanarCurve.Id(), newPlanarCurve);
        const visited = new Set<bigint>();

        const promises = [];
        for (const [id, current] of curvesToProcess) {
            const result = [];
            visited.add(id);
            curvesToProcess.delete(id);
            console.log(id, "=====");

            const crosses = c3d.CurveEnvelope.IntersectWithAll(current, allPlanarCurves, true);

            // For bounded (finite) open curves (like line segments), we need to add in the beginning and end points
            if (current.IsBounded() && !current.IsClosed()) { 
                const begPointOn = new c3d.PointOnCurve(current.GetTMin(), current);
                const begCrossPoint = new c3d.CrossPoint(current.GetLimitPoint(1), begPointOn, begPointOn);
                crosses.unshift(begCrossPoint);

                const endPointOn = new c3d.PointOnCurve(current.GetTMax(), current);
                const endCrossPoint = new c3d.CrossPoint(current.GetLimitPoint(2), endPointOn, endPointOn);
                crosses.push(endCrossPoint);
            } else if (current.IsClosed()) {
                crosses.push(crosses[0]);
            }

            let start = crosses.shift()!.on1.t;
            console.log("starting with ", start);
            for (const cross of crosses) {
                const { on1: { t, curve }, on2: { t: t2, curve: other } } = cross;
                const otherId = other.Id();

                console.log(curve.Id(), t, otherId, t2)

                const stop = t;
                // if (!visited.has(cross.on2.curve.Id())) {
                    console.log("pushing", curve.Id(), start, stop);
                    const trimmed = curve.Trimmed(start, stop, 1)!;
                    result.push(trimmed);
                // }
                start = stop;

                if (!visited.has(otherId)) {
                    curvesToProcess.set(otherId, other);
                }
            }
            promises.push(this.updateCurve(id, result));
        }
        await Promise.all(promises);
    }

    private async updateCurve(id: bigint, result: c3d.Curve[]) {
        const { curve2fragments, allFragments, db } = this;
        if (curve2fragments.has(id)) {
            const invalidated = curve2fragments.get(id)!;
            for (const invalid of invalidated) {
                allFragments.delete(invalid);
                db.removeItem(invalid);
            }
        }
        const placement = new c3d.Placement3D();
        const views: visual.Item[] = [];
        const ps = [];
        for (const fragment of result) {
            const p = db.addItem(new c3d.SpaceInstance(new c3d.PlaneCurve(placement, fragment, true))).then(item => {
                item.layers.set(visual.Layers.CurveFragment);
                allFragments.add(item);
                views.push(item);
            });
            ps.push(p);
        }
        await Promise.all(ps);
        curve2fragments.set(id, views);
    }

    private curve3d2curve(from: visual.SpaceInstance<visual.Curve3D>) {
        const { db } = this;

        const placement_ = new c3d.Placement3D();
        const inst = db.lookup(from);
        const item = inst.GetSpaceItem()!;

        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        try {
            const { curve2d, placement } = curve.GetPlaneCurve(false);

            // Apply an 2d placement to the curve, so that any future booleans work
            const matrix = placement.GetMatrixToPlace(placement_);
            curve2d.Transform(matrix);

            return curve2d;
        } catch (e) {
            console.warn(e);
        }
    }
}