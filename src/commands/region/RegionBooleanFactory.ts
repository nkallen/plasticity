import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export class RegionBooleanFactory extends GeometryFactory {
    regions = new Array<visual.PlaneInstance<visual.Region>>();

    async doUpdate() {
    }

    async doCommit() {
        const input = [];
        let placement: c3d.Placement3D;
        for (const region of this.regions) {
            const inst = this.db.lookup(region);
            const item = inst.GetPlaneItem();
            const r = item.Cast<c3d.Region>(c3d.PlaneType.Region);
            input.push(r);
            placement = inst.GetPlacement();
        }

        const params = new c3d.RegionBooleanParams(c3d.RegionOperationType.Intersect, true);
        const { regions } = c3d.ActionRegion.CreateBooleanResultRegions(input[0], input[1], params);

        const result = [];
        for (const region of regions) {
            result.push(this.db.addItem(new c3d.PlaneInstance(region, placement!)));
        }
        const final = await Promise.all(result);

        for (const region of this.regions) {
            this.db.removeItem(region);
        }
        return final;
    }

    doCancel() {
    }
}