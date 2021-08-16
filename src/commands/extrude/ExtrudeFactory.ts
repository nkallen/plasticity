import { cart2vec, vec2vec } from "../../util/Conversion";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory, ValidationError } from '../GeometryFactory';
import { MaterialOverride } from "../../editor/GeometryDatabase";

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

    protected names = new c3d.SNameMaker(c3d.CreatorType.CurveExtrusionSolid, c3d.ESides.SideNone, 0);

    protected abstract contours: c3d.Contour[];
    protected abstract surface: c3d.Surface;

    async computeGeometry() {
        const { contours, surface, direction, distance1, thickness1, thickness2 } = this;
        let { race1, race2, distance2, } = this;

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

        const solid = this.performAction(sweptData, new c3d.Vector3D(direction.x, direction.y, direction.z), params, ns);
        return solid;
    }

    protected performAction(sweptData: c3d.SweptData, direction: c3d.Vector3D, params: c3d.ExtrusionValues, ns: c3d.SNameMaker[]): c3d.Solid {
        const { names } = this;
        return c3d.ActionSolid.ExtrusionSolid(sweptData, direction, null, null, false, params, names, ns);
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

export class BooleanRegionExtrudeFactory extends RegionExtrudeFactory {
    operationType = c3d.OperationType.Difference;

    private _solid!: visual.Solid;
    model!: c3d.Solid;
    get solid() { return this._solid };
    set solid(s: visual.Solid) {
        this._solid = s;
        this.model = this.db.lookup(s);
    }

    protected performAction(sweptData: c3d.SweptData, direction: c3d.Vector3D, params: c3d.ExtrusionValues, ns: c3d.SNameMaker[]): c3d.Solid {
        const { names, model, operationType } = this;

        return c3d.ActionSolid.ExtrusionResult(model, c3d.CopyMode.Copy, sweptData, direction, params, operationType, names, ns)
    }
}

export class PossiblyBooleanRegionExtrudeFactory extends GeometryFactory implements ExtrudeParams {
    private bool = new BooleanRegionExtrudeFactory(this.db, this.materials, this.signals);
    private fantom = new RegionExtrudeFactory(this.db, this.materials, this.signals);

    get distance1() { return this.bool.distance1 }
    get distance2() { return this.bool.distance2 }
    get race1() { return this.bool.race1 }
    get race2() { return this.bool.race2 }
    get thickness1() { return this.bool.thickness1 }
    get thickness2() { return this.bool.thickness2 }
    get region() { return this.bool.region }
    get direction() { return this.bool.direction }
    get operationType() { return this.bool.operationType }
    get solid() { return this.bool.solid }

    set distance1(distance1: number) { this.bool.distance1 = distance1; this.fantom.distance1 = distance1 }
    set distance2(distance2: number) { this.bool.distance2 = distance2; this.fantom.distance2 = distance2 }
    set race1(race1: number) { this.bool.race1 = race1; this.fantom.race1 = race1 }
    set race2(race2: number) { this.bool.race2 = race2; this.fantom.race2 = race2 }
    set thickness1(thickness1: number) { this.bool.thickness1 = thickness1; this.fantom.thickness1 = thickness1 }
    set thickness2(thickness2: number) { this.bool.thickness2 = thickness2; this.fantom.thickness2 = thickness2 }
    set region(region: visual.PlaneInstance<visual.Region>) { this.bool.region = region; this.fantom.region = region }
    set solid(solid: visual.Solid) { this.bool.solid = solid }
    set operationType(operationType: c3d.OperationType) { this.bool.operationType = operationType }

    isOverlapping = false;
    private _phantom!: c3d.Solid;

    private async precomputeGeometry() {
        const phantom = await this.fantom.computeGeometry();
        this._phantom = phantom;
        if (this.bool.model === undefined) {
            this.isOverlapping = false;
        } else {
            this.isOverlapping = c3d.Action.IsSolidsIntersection(this.bool.model, phantom, new c3d.SNameMaker(-1, c3d.ESides.SideNone, 0));
        }
    }

    async computeGeometry() {
        await this.precomputeGeometry();
        if (this.isOverlapping) {
            return await this.bool.computeGeometry();
        } else {
            return this._phantom;
        }
    }

    protected get phantom() {
        if (this.isOverlapping) return this._phantom;
    }

    get originalItem() {
        return this.bool.solid;
    }

    get shouldHideOriginalItem() {
        return this.isOverlapping;
    }

    get phantomMaterial() {
        if (this.operationType === c3d.OperationType.Difference)
            return phantom_red
        else if (this.operationType === c3d.OperationType.Intersect)
            return phantom_green;
    }
}

const mesh_red = new THREE.MeshBasicMaterial();
mesh_red.color.setHex(0xff0000);
mesh_red.opacity = 0.1;
mesh_red.transparent = true;
mesh_red.fog = false;
mesh_red.polygonOffset = true;
mesh_red.polygonOffsetFactor = 0.1;
mesh_red.polygonOffsetUnits = 1;

const phantom_red: MaterialOverride = {
    mesh: mesh_red
}

const mesh_green = new THREE.MeshBasicMaterial();
mesh_green.color.setHex(0x00ff00);
mesh_green.opacity = 0.1;
mesh_green.transparent = true;
mesh_green.fog = false;
mesh_green.polygonOffset = true;
mesh_green.polygonOffsetFactor = 0.1;
mesh_green.polygonOffsetUnits = 1;

const phantom_green: MaterialOverride  = {
    mesh: mesh_green
}