import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from "../editor/Editor";
import { GeometryDatabase } from '../editor/GeometryDatabase';
import * as visual from "../editor/VisualModel";
import * as THREE from "three";

export default class ContourManager {
    private readonly curve2fragments = new Map<bigint, visual.Item[]>();
    private readonly planar2spatial = new Map<bigint, bigint>();
    private readonly allCurves = new Map<visual.SpaceInstance<visual.Curve3D>, c3d.Curve>();
    private readonly spatial2instance = new Map<bigint, visual.SpaceInstance<visual.Curve3D>>();
    private readonly touched = new Map<visual.SpaceInstance<visual.Curve3D>, Set<visual.SpaceInstance<visual.Curve3D>>>();

    constructor(
        private readonly db: GeometryDatabase,
        signals: EditorSignals
    ) {
        signals.contoursChanged.add(c => this.add(c));
        // signals.curveAdded.add(c => this.add(c));
        // signals.curveRemoved.add(c => this.add(c));
    }

    async remove(curve: visual.SpaceInstance<visual.Curve3D>) {
        const planarCurve = this.allCurves.get(curve);
        if (planarCurve === undefined) return;

        const id = this.planar2spatial.get(planarCurve.Id())!;
        const fragments = this.curve2fragments.get(id) ?? [];
        for (const fragment of fragments) {
            this.db.removeItem(fragment);
        }
        const touched = this.touched.get(curve) ?? new Set();
        for (const touchee of touched) {
            this.remove(touchee);
        }
        for (const touchee of touched) {
            this.add(touchee);
        }

        this.touched.delete(curve);
        this.allCurves.delete(curve);
        this.planar2spatial.delete(planarCurve.Id());
        this.curve2fragments.delete(id);
        this.spatial2instance.delete(id);
    }

    async add(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        const { allCurves } = this;

        const newPlanarCurve = this.curve3d2curve(newCurve);
        if (newPlanarCurve === undefined) return;
        allCurves.set(newCurve, newPlanarCurve);

        const allPlanarCurves = [...allCurves.values()];
        if (allPlanarCurves.length < 2) return;

        const curvesToProcess = new Map<bigint, c3d.Curve>();
        curvesToProcess.set(newPlanarCurve.Id(), newPlanarCurve);
        const visited = new Set<bigint>();

        const promises = [];
        for (const [id, current] of curvesToProcess) {
            const result = [];
            visited.add(id);
            curvesToProcess.delete(id);

            const crosses = c3d.CurveEnvelope.IntersectWithAll(current, allPlanarCurves, true);
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

            if (crosses.length < 1) continue;

            const touched = this.touched.get(newCurve)!;

            // The crosses (intersections) are sorted, so each t[i] (start) to t[i+1] (stop) section of the curve is a cuttable.
            const first = crosses.shift()!;
            let start = first.on1.t;
            for (const cross of crosses) {
                const { on1: { t, curve }, on2: { curve: other } } = cross;
                const otherId = other.Id();

                touched.add(this.spatial2instance.get(this.planar2spatial.get(otherId)!)!);

                const stop = t;
                const trimmed = curve.Trimmed(start, stop, 1);
                start = stop;
                if (trimmed === null) continue;
                result.push(trimmed);

                if (!visited.has(otherId)) {
                    curvesToProcess.set(otherId, other);
                }
            }
            promises.push(this.updateCurve(this.planar2spatial.get(id)!, result));
        }
        await Promise.all(promises);
    }

    private async updateCurve(id: bigint, result: c3d.Curve[]) {
        const { curve2fragments, db } = this;
        if (curve2fragments.has(id)) {
            const invalidated = curve2fragments.get(id)!;
            for (const invalid of invalidated) {
                db.removeItem(invalid, 'silent');
            }
        }
        const placement = new c3d.Placement3D();
        const views: visual.Item[] = [];
        const ps = [];
        for (const fragment of result) {
            const p = db.addItem(new c3d.SpaceInstance(new c3d.PlaneCurve(placement, fragment, true))).then(item => {
                item.layers.set(visual.Layers.CurveFragment);
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

        this.spatial2instance.set(item.Id(), from);
        this.touched.set(from, new Set());

        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        try {
            const { curve2d, placement } = curve.GetPlaneCurve(false);

            // Apply an 2d placement to the curve, so that any future booleans work
            const matrix = placement.GetMatrixToPlace(placement_);
            curve2d.Transform(matrix);

            this.planar2spatial.set(curve2d.Id(), curve.Id());

            return curve2d;
        } catch (e) {
            console.warn(e);
        }
    }
}