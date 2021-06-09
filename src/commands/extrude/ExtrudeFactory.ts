import { TemporaryObject } from '../../GeometryDatabase';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../../src/VisualModel';
import { GeometryFactory } from '../Factory';

abstract class AbstractExtrudeFactory extends GeometryFactory {
    distance1!: number;
    distance2 = 0;
    direction!: THREE.Vector3;

    private temp?: TemporaryObject;

    names = new c3d.SNameMaker(c3d.CreatorType.CurveLoftedSolid, c3d.ESides.SideNone, 0);

    abstract contour: c3d.Contour;
    abstract placement: c3d.Placement3D;

    async doUpdate() {
        const { contour, placement, direction, names } = this;

        const sweptData = new c3d.SweptData(placement, contour);
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(this.distance1, this.distance2);
        const solid = c3d.ActionSolid.ExtrusionSolid(sweptData, new c3d.Vector3D(direction.x, direction.y, direction.z), null, null, false, params, names, ns);

        const temp = await this.db.addTemporaryItem(solid);
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { contour, placement, direction, names } = this;

        const sweptData = new c3d.SweptData(placement, contour);
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(this.distance1, this.distance2);
        const solid = c3d.ActionSolid.ExtrusionSolid(sweptData, new c3d.Vector3D(direction.x, direction.y, direction.z), null, null, false, params, names, ns);

        const result = await this.db.addItem(solid);
        this.temp?.cancel();
        return result;
    }

    doCancel() {
        this.temp?.cancel();
    }
}

export default class ExtrudeFactory extends AbstractExtrudeFactory {
    curve!: visual.SpaceInstance<visual.Curve3D>;

    get contour() {
        const inst = this.db.lookup(this.curve);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { curve2d } = curve.GetPlaneCurve(false);
        return new c3d.Contour([curve2d], true);
    }

    get placement() {
        const inst = this.db.lookup(this.curve);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { placement } = curve.GetPlaneCurve(false);
        return placement;
    }
}

export class RegionExtrudeFactory extends AbstractExtrudeFactory {
    region!: visual.PlaneInstance<visual.Region>;

    get contour() {
        const inst = this.db.lookup(this.region);
        const item = inst.GetPlaneItem();
        const region = item.Cast<c3d.Region>(c3d.PlaneType.Region);
        return region.GetOutContour();
    }

    get placement() {
        const inst = this.db.lookup(this.region);
        return inst.GetPlacement();
    }
}