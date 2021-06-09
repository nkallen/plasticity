import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

export default class RegionFactory extends GeometryFactory {
    contours = new Array<visual.SpaceInstance<visual.Curve3D>>();

    async doUpdate() {
    }

    validate() {
        // FIXME check all placements have the same orientation
    }

    async doCommit() {
        const contours = [];
        let placement_ = new c3d.Placement3D();
        for (const contour of this.contours) {
            const inst = this.db.lookup(contour);
            const item = inst.GetSpaceItem();
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const { curve2d, placement } = curve.GetPlaneCurve(false);

            // Apply an 2d placement to the curve, so that any future booleans work
            const origin = placement.GetOrigin();
            const x = placement.GetAxisX();
            const y = placement.GetAxisY();
            const placement2d = new c3d.Placement(new c3d.CartPoint(origin.x, origin.y), new c3d.Vector(x.x, x.y), new c3d.Vector(y.x, y.y));
            const matrix = new c3d.Matrix(placement2d);
            curve2d.Transform(matrix);

            const model = new c3d.Contour([curve2d], true);
            contours.push(model)
        }

        const regions = c3d.ActionRegion.MakeRegions(contours, true, false);
        const result = [];
        for (const region of regions) {
            result.push(this.db.addItem(new c3d.PlaneInstance(region, placement_!)));
        }
        return Promise.all(result);
    }

    doCancel() {
    }
}

