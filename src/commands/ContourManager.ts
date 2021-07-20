import { EditorSignals } from "../editor/Editor";
import * as visual from "../editor/VisualModel";
import * as cmd from "./Command";
import c3d from '../../build/Release/c3d.node';

export default class ContourManager {
    constructor(
        private readonly editor: cmd.EditorLike,
        private readonly signals: EditorSignals
    ) {
        signals.contoursChanged.add(c => this.update(c));
    }

    async update(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        console.log(">======================")
        const { db } = this.editor;
        // const regions = db.find(visual.PlaneInstance) as visual.PlaneInstance<visual.Region>[];
        // for (const region of regions) db.removeItem(region);

        const allCurves = db.find(visual.SpaceInstance) as visual.SpaceInstance<visual.Curve3D>[];

        const newPlanarCurve = this.curve3d2curve(newCurve);
        if (newPlanarCurve === undefined) return;

        const allPlanarCurves = [];
        for (const curve3d of allCurves) {
            if (curve3d === newCurve) continue;
            const curve = this.curve3d2curve(curve3d);
            if (curve === undefined) continue;
            allPlanarCurves.push(curve);
        }
        if (allPlanarCurves.length === 0) return;

        const curvesToProcess = new Map<bigint, c3d.Curve>();
        curvesToProcess.set(newPlanarCurve.Id(), newPlanarCurve);
        const visited = new Set<bigint>();

        const result = [];
        for (const [id, current] of curvesToProcess) {
            visited.add(id);
            curvesToProcess.delete(id);

            const crosses = c3d.CurveEnvelope.IntersectWithAll(current, allPlanarCurves, true);
            let start = current.GetTMin();
            for (const cross of crosses) {
                const { t, curve } = cross.on1;
                const stop = t;
                const trimmed = curve.Trimmed(start, stop, 1)!;
                result.push(trimmed);
                start = stop;

                const { curve: other } = cross.on2;
                const id = other.Id();
                if (!visited.has(id)) {
                    curvesToProcess.set(id, other);
                }
            }
            const trimmed = current.Trimmed(start, current.GetTMax(), 1)!;
            result.push(trimmed);
        }
    }

    private curve3d2curve(from: visual.SpaceInstance<visual.Curve3D>) {
        const { db } = this.editor;

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