import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { cart2vec, vec2vec } from "../../util/Conversion";
import { PossiblyBooleanFactory } from "../boolean/BooleanFactory";
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

    protected names = new c3d.SNameMaker(c3d.CreatorType.CurveExtrusionSolid, c3d.ESides.SideNone, 0);

    protected abstract contours: c3d.Contour[];
    protected abstract surface: c3d.Surface;

    private _operationType = c3d.OperationType.Difference
    get operationType() { return this._operationType }
    set operationType(operationType: c3d.OperationType) { this._operationType = operationType }

    private _solid?: visual.Solid;
    protected model?: c3d.Solid;
    get solid() { return this._solid }
    set solid(solid: visual.Solid | undefined) {
        this._solid = solid;
        if (solid !== undefined) this.model = this.db.lookup(solid);
    }

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

        const solid = await this.performAction(sweptData, new c3d.Vector3D(direction.x, direction.y, direction.z), params, ns);
        return solid;
    }

    protected async performAction(sweptData: c3d.SweptData, direction: c3d.Vector3D, params: c3d.ExtrusionValues, ns: c3d.SNameMaker[]): Promise<c3d.Solid> {
        const { names, model: solid, operationType } = this;

        if (solid === undefined) {
            return c3d.ActionSolid.ExtrusionSolid(sweptData, direction, null, null, false, params, names, ns);
        } else {
            return c3d.ActionSolid.ExtrusionResult_async(solid, c3d.CopyMode.Copy, sweptData, direction, params, operationType, names, ns)
        }
    }
}

export class CurveExtrudeFactory extends AbstractExtrudeFactory {
    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    protected contours!: c3d.Contour[];
    protected surface!: c3d.Surface;
    private _normal!: THREE.Vector3;
    private _center!: THREE.Vector3;
    get curves() { return this._curves }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        this._curves = curves;
        const contours: c3d.Contour[] = [];
        for (const curve of curves) {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;

            if (item.IsA() === c3d.SpaceType.ContourOnSurface || item.IsA() === c3d.SpaceType.ContourOnPlane) {
                const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
                contours.push(model.GetContour());
            } else {
                const model = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
                const { curve2d } = model.GetPlaneCurve(false);
                contours.push(new c3d.Contour([curve2d], true));
            }
        }
        this.contours = contours;

        const inst = this.db.lookup(curves[0]);
        const item = inst.GetSpaceItem()!;

        let placement;
        if (item.IsA() === c3d.SpaceType.ContourOnPlane) {
            const model = item.Cast<c3d.ContourOnPlane>(item.IsA());
            this.surface = model.GetSurface();
            placement = model.GetPlacement();
        } else {
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            placement = curve.GetPlaneCurve(false).placement;
            this.surface = new c3d.Plane(placement, 0);
        }
        this._normal = vec2vec(placement.GetAxisZ())
        this._center = cart2vec(placement.GetOrigin());
    }

    get direction(): THREE.Vector3 { return this._normal }
    get center(): THREE.Vector3 { return this._center }
}

export class FaceExtrudeFactory extends AbstractExtrudeFactory {
    private _face!: visual.Face;
    protected contours!: c3d.Contour[];
    protected surface!: c3d.Surface;
    private _normal!: THREE.Vector3;
    private _center!: THREE.Vector3;
    get face() { return this._face }
    set face(face: visual.Face) {
        this._face = face;
        const model = this.db.lookupTopologyItem(face);

        const { surface, contours } = model.GetSurfaceCurvesData();
        const fsurface = model.GetSurface();
        this.contours = contours;
        this.surface = surface;

        const u = fsurface.GetUMid(), v = fsurface.GetVMid();
        const p = fsurface.PointOn(new c3d.CartPoint(u, v));
        this._center = cart2vec(p);
        const n = model.Normal(u, v);
        this._normal = vec2vec(n);
    }

    get operationType() {
        return this.distance1 > 0 ? c3d.OperationType.Union : c3d.OperationType.Difference;
    }
    set operationType(ot: c3d.OperationType) {}

    get normal(): THREE.Vector3 { return this._normal }
    get center(): THREE.Vector3 { return this._center }
    get direction(): THREE.Vector3 { return this._normal }
}

export class RegionExtrudeFactory extends AbstractExtrudeFactory {
    private _region!: visual.PlaneInstance<visual.Region>;
    protected contours!: c3d.Contour[];
    protected surface!: c3d.Surface;
    private _placement!: c3d.Placement3D;
    get region() { return this._region }
    set region(region: visual.PlaneInstance<visual.Region>) {
        this._region = region;
        const inst = this.db.lookup(region);
        const item = inst.GetPlaneItem();
        if (item === null) throw new Error("invalid precondition");
        const model = item.Cast<c3d.Region>(c3d.PlaneType.Region);
        const contours = [];
        for (let i = 0, l = model.GetContoursCount(); i < l; i++) {
            const contour = model.GetContour(i);
            if (contour === null) throw new Error("invalid precondition");
            contours.push(contour);
        }
        this.contours = contours;

        this._placement = inst.GetPlacement();
        this.surface = new c3d.Plane(this._placement, 0);
    }

    get direction(): THREE.Vector3 {
        const placement = this._placement;
        const z = placement.GetAxisZ();
        return vec2vec(z);
    }

    get center(): THREE.Vector3 {
        return cart2vec(this._placement.GetOrigin());
    }
}

export class ExtrudeFactory extends GeometryFactory implements ExtrudeParams {
    private readonly regionExtrude = new RegionExtrudeFactory(this.db, this.materials, this.signals);
    private readonly faceExtrude = new FaceExtrudeFactory(this.db, this.materials, this.signals);
    private readonly curveExtrude = new CurveExtrudeFactory(this.db, this.materials, this.signals);
    private readonly factories = [this.regionExtrude, this.faceExtrude, this.curveExtrude];

    set region(region: visual.PlaneInstance<visual.Region> | undefined) {
        if (region === undefined) return;
        this.regionExtrude.region = region;
    }

    set face(face: visual.Face | undefined) {
        if (face === undefined) return;
        this.faceExtrude.face = face;
    }

    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        if (curves.length === 0) return;
        this.curveExtrude.curves = curves;
    }

    computeGeometry() {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.computeGeometry();
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.computeGeometry();
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.computeGeometry();
        else throw new ValidationError("need region, face, or curves");
    }

    set solid(solid: visual.Solid) { for (const f of this.factories) f.solid = solid }

    get operationType() {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.operationType;
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.operationType;
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.operationType;
        else throw new ValidationError("need region, face, or curves");
    }
    set operationType(operationType: c3d.OperationType) { for (const f of this.factories) f.operationType = operationType }

    set distance1(distance1: number) { for (const f of this.factories) f.distance1 = distance1 }
    set distance2(distance2: number) { for (const f of this.factories) f.distance2 = distance2 }
    set race1(race1: number) { for (const f of this.factories) f.race1 = race1 }
    set race2(race2: number) { for (const f of this.factories) f.race2 = race2 }
    set thickness1(thickness1: number) { for (const f of this.factories) f.thickness1 = thickness1 }
    set thickness2(thickness2: number) { for (const f of this.factories) f.thickness2 = thickness2 }

    get direction() {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.direction;
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.direction;
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.direction;
        else throw new ValidationError("need region, face, or curves");
    }

    get center() {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.center;
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.center;
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.center;
        else throw new ValidationError("need region, face, or curves");
    }
}

export class PossiblyBooleanExtrudeFactory extends PossiblyBooleanFactory<ExtrudeFactory> implements ExtrudeParams {
    protected bool = new ExtrudeFactory(this.db, this.materials, this.signals);
    protected fantom = new ExtrudeFactory(this.db, this.materials, this.signals);

    set face(face: visual.Face) {
        this.bool.face = face;
        this.fantom.face = face
        this.solid = face.parentItem;
    }

    get distance1() { return this.bool.distance1 }
    get distance2() { return this.bool.distance2 }
    get race1() { return this.bool.race1 }
    get race2() { return this.bool.race2 }
    get thickness1() { return this.bool.thickness1 }
    get thickness2() { return this.bool.thickness2 }
    get direction() { return this.bool.direction }
    get center() { return this.bool.center }

    set distance1(distance1: number) { this.bool.distance1 = distance1; this.fantom.distance1 = distance1 }
    set distance2(distance2: number) { this.bool.distance2 = distance2; this.fantom.distance2 = distance2 }
    set race1(race1: number) { this.bool.race1 = race1; this.fantom.race1 = race1 }
    set race2(race2: number) { this.bool.race2 = race2; this.fantom.race2 = race2 }
    set thickness1(thickness1: number) { this.bool.thickness1 = thickness1; this.fantom.thickness1 = thickness1 }
    set thickness2(thickness2: number) { this.bool.thickness2 = thickness2; this.fantom.thickness2 = thickness2 }

    set region(region: visual.PlaneInstance<visual.Region>) { this.bool.region = region; this.fantom.region = region }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) { this.bool.curves = curves; this.fantom.curves = curves }
}
