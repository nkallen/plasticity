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
        const contours = [];
        const placement_ = new c3d.Placement3D();
        for (const contour of this.contours) {
            const inst = this.db.lookup(contour);
            const item = inst.GetSpaceItem();
            if (item === null) throw new Error("invalid precondition");
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const { curve2d, placement } = curve.GetPlaneCurve(false);

            // Apply an 2d placement to the curve, so that any future booleans work
            const matrix = placement.GetMatrixToPlace(placement_);
            curve2d.Transform(matrix);

            const model = new c3d.Contour([curve2d], true);
            contours.push(model)
        }

        const regions = c3d.ActionRegion.GetCorrectRegions(contours, false);
        const result = [];
        for (const region of regions) {
            result.push(this.db.addItem(new c3d.PlaneInstance(region, placement_!)));
        }
        return Promise.all(result);
    }

    protected doCancel() { }
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