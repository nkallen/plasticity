import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../VisualModel';
import { GeometryFactory } from '../Factory';

export default class RegionFactory extends GeometryFactory {
    contour!: visual.SpaceInstance<visual.Curve3D>;

    async doUpdate() {
    }

    async doCommit() {
        const inst = this.db.lookup(this.contour);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { curve2d, placement } = curve.GetPlaneCurve(false);
        const contour = new c3d.Contour([curve2d], true);

        const regions = c3d.ActionRegion.MakeRegions([contour], true, false);
        const result = [];
        for (const region of regions) {
            console.log(region);
            result.push(this.db.addItem(new c3d.PlaneInstance(region, placement)));
        }
        return Promise.all(result);
    }

    doCancel() {
    }
}