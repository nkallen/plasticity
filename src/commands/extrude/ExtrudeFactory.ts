import { TemporaryObject } from '../../GeometryDatabase';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../../src/VisualModel';
import { GeometryFactory } from '../Factory';

export default class ExtrudeFactory extends GeometryFactory {
    contour!: visual.SpaceInstance<visual.Curve3D>;
    direction!: THREE.Vector3;
    distance1!: number;
    distance2 = 0;

    private temp?: TemporaryObject;

    async doUpdate() {
        const inst = this.db.lookup(this.contour);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { curve2d, placement } = curve.GetPlaneCurve(false);
        const contour = new c3d.Contour([curve2d], true);

        const names = new c3d.SNameMaker(c3d.CreatorType.CurveLoftedSolid, c3d.ESides.SideNone, 0);
        const sweptData = new c3d.SweptData(placement, contour);
        const d = this.direction;
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(this.distance1, this.distance2);
        const solid = c3d.ActionSolid.ExtrusionSolid(sweptData, new c3d.Vector3D(d.x, d.y, d.z), null, null, false, params, names, ns);

        const temp = await this.db.addTemporaryItem(solid);
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const inst = this.db.lookup(this.contour);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { curve2d, placement } = curve.GetPlaneCurve(false);
        const contour = new c3d.Contour([curve2d], true);

        const names = new c3d.SNameMaker(c3d.CreatorType.CurveLoftedSolid, c3d.ESides.SideNone, 0);
        const sweptData = new c3d.SweptData(placement, contour);
        const d = this.direction;
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(this.distance1, this.distance2);
        const solid = c3d.ActionSolid.ExtrusionSolid(sweptData, new c3d.Vector3D(d.x, d.y, d.z), null, null, false, params, names, ns);

        const result = await this.db.addItem(solid);
        this.temp?.cancel();
        return result;
    }

    doCancel() {
        return super.cancel();
    }
}