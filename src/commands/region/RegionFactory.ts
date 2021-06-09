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
        let placement_ = undefined;
        for (const contour of this.contours) {
            const inst = this.db.lookup(contour);
            const item = inst.GetSpaceItem();
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const { curve2d, placement } = curve.GetPlaneCurve(false);
            const origin = placement.GetOrigin();
            placement.SetOrigin(new c3d.CartPoint3D(0,0,0));
            placement_ = placement;
            curve2d.Move(new c3d.Vector(origin.x, origin.y));
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

