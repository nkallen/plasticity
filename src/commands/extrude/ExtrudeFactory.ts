import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { composeMainName, point2point, unit, vec2vec } from "../../util/Conversion";
import { PossiblyBooleanFactory } from "../boolean/BooleanFactory";
import { GeometryFactory, NoOpError, ValidationError } from '../../command/GeometryFactory';

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

    isOverlapping = false;
    isSurface = false;

    abstract direction: THREE.Vector3;

    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveExtrusionSolid, this.db.version), c3d.ESides.SideNone, 0);

    protected abstract contours2d: c3d.Contour[];
    protected abstract curves3d: c3d.Curve3D[];
    protected abstract surface: c3d.Surface;

    protected _operationType?: c3d.OperationType;
    get operationType() { return this._operationType ?? this.defaultOperationType }
    set operationType(operationType: c3d.OperationType) { this._operationType = operationType }
    protected get defaultOperationType() { return c3d.OperationType.Difference }

    private _solid?: visual.Solid;
    protected model?: c3d.Solid;
    get solid() { return this._solid }
    set solid(solid: visual.Solid | undefined) {
        this._solid = solid;
        if (solid !== undefined) this.model = this.db.lookup(solid);
    }

    async calculate() {
        const { contours2d, curves3d, surface, direction, distance1, thickness1, thickness2 } = this;
        let { race1, race2, distance2, } = this;

        if (distance1 === 0 && distance2 === 0) throw new NoOpError();

        const sweptData = contours2d.length > 0 ? new c3d.SweptData(surface, contours2d) : new c3d.SweptData(curves3d[0]);
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.ExtrusionValues(unit(distance1), unit(distance2));

        // NOTE: structs are always copy-on-read because of memory boundary issues, so you need to do this convoluted
        // assignment for nested structs.
        const { side1, side2 } = params;
        side1.rake = race1;
        params.side1 = side1;

        side2.rake = race2;
        params.side2 = side2;
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);

        return this.performAction(sweptData, vec2vec(direction, 1), params, ns);
    }

    protected async performAction(sweptData: c3d.SweptData, direction: c3d.Vector3D, params: c3d.ExtrusionValues, ns: c3d.SNameMaker[]): Promise<c3d.Solid> {
        const { names, model: solid, operationType } = this;

        if (solid === undefined) {
            return c3d.ActionSolid.ExtrusionSolid_async(sweptData, direction, null, null, false, params, names, ns);
        } else {
            return c3d.ActionSolid.ExtrusionResult_async(solid, c3d.CopyMode.Copy, sweptData, direction, params, operationType, names, ns)
        }
    }

    get originalItem() {
        return this.solid;
    }
}

export class CurveExtrudeFactory extends AbstractExtrudeFactory {
    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    protected contours2d!: c3d.Contour[];
    protected curves3d!: c3d.Curve3D[];
    protected surface!: c3d.Surface;
    private _normal!: THREE.Vector3;
    private _center!: THREE.Vector3;
    get curves() { return this._curves }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        this._curves = curves;
        this._center = new THREE.Vector3();
        const contours2d: c3d.Contour[] = [];
        const curves3d: c3d.Curve3D[] = [];
        const bbox = new THREE.Box3();
        for (const curve of curves) {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;

            if (item.IsA() === c3d.SpaceType.ContourOnSurface || item.IsA() === c3d.SpaceType.ContourOnPlane) {
                const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
                contours2d.push(model.GetContour());
            } else if (item.IsA() === c3d.SpaceType.Contour3D) {
                const model = item.Cast<c3d.Contour3D>(item.IsA());
                curves3d.push(model);
            } else {
                const model = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
                if (model.IsPlanar()) {
                    const { curve2d } = model.GetPlaneCurve(false);
                    contours2d.push(new c3d.Contour([curve2d], true));
                } else {
                    curves3d.push(model);
                }
            }
            bbox.expandByObject(curve);
        }
        this._center = bbox.getCenter(new THREE.Vector3());
        this.contours2d = contours2d;
        this.curves3d = curves3d;

        const inst = this.db.lookup(curves[0]);
        const item = inst.GetSpaceItem()!;

        let placement;
        if (item.IsA() === c3d.SpaceType.ContourOnPlane) {
            const model = item.Cast<c3d.ContourOnPlane>(item.IsA());
            this.surface = model.GetSurface();
            placement = model.GetPlacement();
        } else if (item.IsA() === c3d.SpaceType.ContourOnSurface) {
            const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
            this.surface = model.GetSurface();
            placement = new c3d.Placement3D();
        } else {
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            if (curve.IsPlanar()) {
                placement = curve.GetPlaneCurve(false).placement;
                this.surface = new c3d.Plane(placement, 0);
            } else {
                placement = new c3d.Placement3D();
            }
        }
        this._normal = vec2vec(placement.GetAxisZ(), 1)
    }

    get direction(): THREE.Vector3 { return this._normal }
    get center(): THREE.Vector3 { return this._center }
}

export class FaceExtrudeFactory extends AbstractExtrudeFactory {
    private _face!: visual.Face;
    protected contours2d!: c3d.Contour[];
    protected curves3d: c3d.Contour3D[] = [];
    protected surface!: c3d.Surface;
    private _normal!: THREE.Vector3;
    private _center!: THREE.Vector3;
    get face() { return this._face }
    set face(face: visual.Face) {
        this._face = face;
        const model = this.db.lookupTopologyItem(face);

        const { surface, contours } = model.GetSurfaceCurvesData();
        const fsurface = model.GetSurface();
        this.contours2d = contours;
        this.surface = surface;

        const u = fsurface.GetUMid(), v = fsurface.GetVMid();
        const p = fsurface.PointOn(new c3d.CartPoint(u, v));
        this._center = point2point(p);
        const n = model.Normal(u, v);
        this._normal = vec2vec(n, 1);
    }

    get defaultOperationType() {
        return this.distance1 > 0 ? c3d.OperationType.Union : c3d.OperationType.Difference;
    }

    get normal(): THREE.Vector3 { return this._normal }
    get center(): THREE.Vector3 { return this._center }
    get direction(): THREE.Vector3 { return this._normal }
}

export class RegionExtrudeFactory extends AbstractExtrudeFactory {
    private _region!: visual.PlaneInstance<visual.Region>;
    protected contours2d!: c3d.Contour[];
    protected curves3d: c3d.Contour3D[] = [];
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
        this.contours2d = contours;

        this._placement = inst.GetPlacement();
        this.surface = new c3d.Plane(this._placement, 0);

        const bbox = new THREE.Box3();
        bbox.setFromObject(region);
        bbox.getCenter(this._center);
    }

    get defaultOperationType() { return this.isSurface ? c3d.OperationType.Union : c3d.OperationType.Difference }

    get direction(): THREE.Vector3 {
        const placement = this._placement;
        const z = placement.GetAxisZ();
        return vec2vec(z, 1);
    }

    private _center = new THREE.Vector3();
    get center(): THREE.Vector3 {
        return this._center;
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

    calculate(): Promise<c3d.Solid> {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.calculate();
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.calculate();
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.calculate();
        else throw new ValidationError("need region, face, or curves");
    }

    get extruded() {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.region;
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.face;
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.curves;
        else throw new ValidationError();
    }

    set solid(solid: visual.Solid | undefined) { for (const f of this.factories) f.solid = solid }
    get solid() {
        if (this.regionExtrude.region !== undefined) return this.regionExtrude.solid;
        else if (this.faceExtrude.face !== undefined) return this.faceExtrude.solid;
        else if (this.curveExtrude.curves !== undefined) return this.curveExtrude.solid;
        else throw new ValidationError("need region, face, or curves");
    }

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

    get distance1() { return this.factories[0].distance1 }
    get distance2() { return this.factories[0].distance2 }
    get race1() { return this.factories[0].race1 }
    get race2() { return this.factories[0].race2 }
    get thickness1() { return this.factories[0].thickness1 }
    get thickness2() { return this.factories[0].thickness2 }

    set isOverlapping(isOverlapping: boolean) { for (const f of this.factories) f.isOverlapping = isOverlapping }
    set isSurface(isSurface: boolean) { for (const f of this.factories) f.isSurface = isSurface }

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

    get originalItem() {
        return this.solid;
    }
}

export class PossiblyBooleanExtrudeFactory extends PossiblyBooleanFactory<ExtrudeFactory> implements ExtrudeParams {
    protected bool = new ExtrudeFactory(this.db, this.materials, this.signals);
    protected fantom = new ExtrudeFactory(this.db, this.materials, this.signals);

    get extruded() { return this.bool.extruded }

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

    // NOTE: Face differes from region and curves in that we infer the solid
    set face(face: visual.Face) {
        this.bool.face = face;
        this.fantom.face = face;

        const solid = face.parentItem;
        this.solid = solid;
    }

    set region(region: visual.PlaneInstance<visual.Region>) { this.bool.region = region; this.fantom.region = region }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) { this.bool.curves = curves; this.fantom.curves = curves }
}
