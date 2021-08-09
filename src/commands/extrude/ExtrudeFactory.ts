import { cart2vec, vec2vec } from "../../util/Conversion";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export interface ExtrudeParams {
    distance1: number;
    distance2: number;
    race1: number;
    race2: number;
    thickness1: number;
    thickness2: number;
}

abstract class AbstractExtrudeFactory extends GeometryFactory implements ExtrudeParams {
    distance1 = 0;
    distance2 = 0;
    race1 = 0;
    race2 = 0;
    thickness1 = 0;
    thickness2 = 0;

    abstract direction: THREE.Vector3;

    private names = new c3d.SNameMaker(c3d.CreatorType.CurveExtrusionSolid, c3d.ESides.SideNone, 0);

    protected abstract contours: c3d.Contour[];
    protected abstract surface: c3d.Surface;

    async computeGeometry() {
        const { contours, surface, direction, names, distance1, distance2, race1, race2, thickness1, thickness2 } = this;

        if (distance1 === 0 && distance2 === 0) throw new ValidationError("invalid data");

        const sweptData = new c3d.SweptData(surface, contours);
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(distance1, distance2);

        // NOTE: structs are always copy-on-read because of memory boundary issues, so you need to do this convoluted
        // assignment for nested structs.
        const side1 = params.side1;
        side1.rake = race1;
        params.side1 = side1;
        const side2 = params.side2;
        side2.rake = race2;
        params.side2 = side2;
        params.thickness1 = thickness1;
        params.thickness2 = thickness2;

        const solid = c3d.ActionSolid.ExtrusionSolid(sweptData, new c3d.Vector3D(direction.x, direction.y, direction.z), null, null, false, params, names, ns);

        return solid;
    }
}

export default class ExtrudeFactory extends AbstractExtrudeFactory {
    curves!: visual.SpaceInstance<visual.Curve3D>[];
    direction!: THREE.Vector3;

    protected get contours() {
        const result: c3d.Contour[] = [];
        for (const curve of this.curves) {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;

            if (item.IsA() === c3d.SpaceType.ContourOnSurface || item.IsA() === c3d.SpaceType.ContourOnPlane) {
                const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
                result.push(model.GetContour());
            } else {
                const model = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
                const { curve2d } = model.GetPlaneCurve(false);
                result.push(new c3d.Contour([curve2d], true));
            }
        }
        return result;
    }

    protected get surface() {
        const inst = this.db.lookup(this.curves[0]);
        const item = inst.GetSpaceItem()!;

        if (item.IsA() === c3d.SpaceType.ContourOnSurface || item.IsA() === c3d.SpaceType.ContourOnPlane) {
            const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
            return model.GetSurface();
        } else {
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const { placement } = curve.GetPlaneCurve(false);
            return new c3d.Plane(placement, 0);
        }
    }
}

export class RegionExtrudeFactory extends AbstractExtrudeFactory {
    region!: visual.PlaneInstance<visual.Region>;

    protected get contours() {
        const inst = this.db.lookup(this.region);
        const item = inst.GetPlaneItem();
        if (item === null) throw new Error("invalid precondition");
        const region = item.Cast<c3d.Region>(c3d.PlaneType.Region);
        const result = [];
        for (let i = 0, l = region.GetContoursCount(); i < l; i++) {
            const contour = region.GetContour(i);
            if (contour === null) throw new Error("invalid precondition");
            result.push(contour);
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
        return vec2vec(z);
    }
}