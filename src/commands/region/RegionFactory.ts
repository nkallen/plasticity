import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export class RegionFactory extends GeometryFactory {
    contours = new Array<visual.SpaceInstance<visual.Curve3D>>();

    protected async doUpdate() { }

    validate() {
        // FIXME check all placements have the same orientation
        //                 else if ( place->GetAxisZ().Colinear( instPlace.GetAxisZ() ) )
    }

    protected async doCommit() {
        const curves = [];
        const placement_ = new c3d.Placement3D();
        for (const contour of this.contours) {
            const inst = this.db.lookup(contour);
            const item = inst.GetSpaceItem();
            if (item === null) throw new Error("invalid precondition");
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            try {
                const { curve2d, placement } = curve.GetPlaneCurve(false);

                // Apply an 2d placement to the curve, so that any future booleans work
                const matrix = placement.GetMatrixToPlace(placement_);
                curve2d.Transform(matrix);

                curves.push(curve2d);
            } catch (e) {
                console.warn(e);
            }
        }

        // const crosses = c3d.CurveEnvelope.IntersectWithAll(first, rest, true);

        const { contours, graph } = c3d.ContourGraph.OuterContoursBuilder(curves);

        const regions = c3d.ActionRegion.GetCorrectRegions(contours, false);
        const result = [];
        for (const region of regions) {
            result.push(this.db.addItem(new c3d.PlaneInstance(region, placement_!)));
        }
        return Promise.all(result);
    }

    protected doCancel() { }
}

export class FooFactory extends GeometryFactory {
    newCurve!: visual.SpaceInstance<visual.Curve3D>;
    curves!: visual.SpaceInstance<visual.Curve3D>[];

    protected async doCommit() {
        const curves = [];
        const newCurve = this.curve3d2curve(this.newCurve);
        if (newCurve === undefined) throw new Error("invalid precondition");
        for (const curve3d of this.curves) {
            const curve = this.curve3d2curve(curve3d);
            if (curve !== undefined) curves.push(curve);
        }

        const crosses = c3d.CurveEnvelope.IntersectWithAll(newCurve, curves, true);

        const result = [];
        let start = newCurve.GetTMin();
        for (const cross of crosses) {
            const { t, curve } = cross.on1;
            const stop = t;
            const trimmed = curve.Trimmed(start, stop, 1)!;
            result.push(trimmed);
            start = stop;
        }
        const trimmed = newCurve.Trimmed(start, newCurve.GetTMax(), 1)!;
        result.push(trimmed);
        
        const ps = [];
        for (const r of result) {
            ps.push(this.db.addItem(new c3d.SpaceInstance(new c3d.PlaneCurve(new c3d.Placement3D(), r, true))));;
        }
        return Promise.all(ps);
    }

    protected doCancel() { }
    protected async doUpdate() { }

    curve3d2curve(from: visual.SpaceInstance<visual.Curve3D>) {
        const placement_ = new c3d.Placement3D();
        const inst = this.db.lookup(from);
        const item = inst.GetSpaceItem();
        if (item === null) throw new Error("invalid precondition");
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


// export class RegionFactory2 extends GeometryFactory {
//     contours = new Array<visual.SpaceInstance<visual.Curve3D>>();
//     point!: THREE.Vector2;

//     protected async computeGeometry() {
//         const { point } = this;

//         const contours = [];
//         const placement_ = new c3d.Placement3D();
//         for (const contour of this.contours) {
//             const inst = this.db.lookup(contour);
//             const item = inst.GetSpaceItem();
//             const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
//             const { curve2d, placement } = curve.GetPlaneCurve(false);

//             // Apply an 2d placement to the curve, so that any future booleans work
//             const matrix = placement.GetMatrixToPlace(placement_);
//             curve2d.Transform(matrix);

//             const model = new c3d.Contour([curve2d], true);
//             contours.push(model)
//         }

//         const contour = c3d.ActionCurve.EnvelopeContour(contours, new c3d.CartPoint(point.x, point.y));

//         const regions = c3d.ActionRegion.GetCorrectRegions([contour], false);
//         const result = [];
//         for (const region of regions) {
//             result.push(new c3d.PlaneInstance(region, placement_!));
//         }

//         return result;
//     }
// }