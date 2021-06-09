import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../../src/VisualModel';
import { TemporaryObject } from '../../GeometryDatabase';
import { GeometryFactory } from '../Factory';

abstract class AbstractExtrudeFactory extends GeometryFactory {
    distance1!: number;
    distance2 = 0;
    abstract direction: THREE.Vector3;

    private temp?: TemporaryObject;

    names = new c3d.SNameMaker(c3d.CreatorType.CurveLoftedSolid, c3d.ESides.SideNone, 0);

    protected abstract contours: c3d.Contour[];
    protected abstract surface: c3d.Surface;

    async doUpdate() {
        const { contours, surface, direction, names } = this;

        const sweptData = new c3d.SweptData(surface, contours);
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(this.distance1, this.distance2);
        const solid = c3d.ActionSolid.ExtrusionSolid(sweptData, new c3d.Vector3D(direction.x, direction.y, direction.z), null, null, false, params, names, ns);

        const temp = await this.db.addTemporaryItem(solid);
        this.temp?.cancel();
        this.temp = temp;
    }

    async doCommit() {
        const { contours, surface, direction, names } = this;

        const sweptData = new c3d.SweptData(surface, contours);
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
    direction!: THREE.Vector3;

    protected get contours() {
        const inst = this.db.lookup(this.curve);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { curve2d } = curve.GetPlaneCurve(false);
        return [new c3d.Contour([curve2d], true)];
    }

    protected get surface() {
        const inst = this.db.lookup(this.curve);
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const { placement } = curve.GetPlaneCurve(false);
        return new c3d.Plane(placement, 0);
    }
}

export class RegionExtrudeFactory extends AbstractExtrudeFactory {
    region!: visual.PlaneInstance<visual.Region>;

    protected get contours() {
        const inst = this.db.lookup(this.region);
        const item = inst.GetPlaneItem();
        const region = item.Cast<c3d.Region>(c3d.PlaneType.Region);
        const result = [];
        for (let i = 0, l = region.GetContoursCount(); i < l; i++) {
            result.push(region.GetContour(i));
        }
        return result;
    }

    private get placement() {
        const inst = this.db.lookup(this.region);
        const placement = inst.GetPlacement();
        return placement;
    }

    protected get surface() {
        return new c3d.Plane(this.placement, 0);
    }

    get direction() {
        const placement = this.placement;
        const z = placement.GetAxisZ();
        const normal = new THREE.Vector3(z.x, z.y, z.z);
        return normal;
    }
}