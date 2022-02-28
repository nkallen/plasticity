import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { delegate, derive } from "../../command/FactoryBuilder";
import { NoOpError } from '../../command/GeometryFactory';
import { MultiGeometryFactory, MultiplyableFactory } from "../../command/MultiFactory";
import { composeMainName, point2point, unit, vec2vec } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { MultiBooleanFactory } from "../boolean/BooleanFactory";
import { PossiblyBooleanFactory } from "../boolean/PossiblyBooleanFactory";
import { SweptParams } from "../evolution/RevolutionFactory";
import { SweepFactory } from "../evolution/SweepFactory";

export interface ExtrudeParams extends SweptParams {
    distance1: number;
    distance2: number;
    race1: number;
    race2: number;
}

abstract class AbstractExtrudeFactory extends SweepFactory implements ExtrudeParams {
    distance1 = 0;
    distance2 = 0;
    race1 = 0;
    race2 = 0;

    isOverlapping = false;
    isSurface = false;

    protected names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveExtrusionSolid, this.db.version), c3d.ESides.SideNone, 0);

    protected _operationType?: c3d.OperationType;
    get operationType() { return this._operationType ?? this.defaultOperationType }
    set operationType(operationType: c3d.OperationType) { this._operationType = operationType }
    get defaultOperationType() { return c3d.OperationType.Difference }

    private _target!: { view?: visual.Solid, model?: c3d.Solid };
    @derive(visual.Solid) get target(): visual.Solid { throw '' }
    set target(target: visual.Solid | c3d.Solid) { }

    set tool(tool: visual.Solid | c3d.Solid) { }

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
        const { names, _target: { model: solid }, operationType } = this;

        if (solid === undefined) {
            const result = await c3d.ActionSolid.ExtrusionSolid_async(sweptData, direction, null, null, false, params, names, ns);
            return result;
        } else {
            return c3d.ActionSolid.ExtrusionResult_async(solid, c3d.CopyMode.Copy, sweptData, direction, params, operationType, names, ns)
        }
    }

    get direction(): THREE.Vector3 {
        const placement = this.placement;
        const z = placement.GetAxisZ();
        return vec2vec(z, 1);
    }

    get originalItem() {
        return this._target.view;
    }
}

export class CurveExtrudeFactory extends AbstractExtrudeFactory {
    get curves(): visual.SpaceInstance<visual.Curve3D>[] { return super.curves }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        super.curves = curves;
        const z = this._placement.GetAxisZ();
        this._direction = vec2vec(z, 1);
    }

    private _direction!: THREE.Vector3;
    get direction(): THREE.Vector3 { return this._direction }
    set direction(direction: THREE.Vector3) { this._direction = direction }
}

export class FaceExtrudeFactory extends AbstractExtrudeFactory {
    private _normal!: THREE.Vector3;
    override get face() { return super.face }
    override set face(face: visual.Face) {
        super.face = face;
        const model = this.db.lookupTopologyItem(face);
        const fsurface = model.GetSurface();

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
    set direction(direction: THREE.Vector3) { this._normal = direction }
}

export class RegionExtrudeFactory extends AbstractExtrudeFactory {
    override get regions() { return super.regions }
    override set regions(regions: visual.PlaneInstance<visual.Region>[]) {
        super.regions = regions;
        const first = regions[0];
        const inst = this.db.lookup(first);
        this._placement = inst.GetPlacement();

        const z = this._placement.GetAxisZ();
        this._direction = vec2vec(z, 1);

        const bbox = new THREE.Box3();
        bbox.setFromObject(first);
        bbox.getCenter(this._center);
    }

    get defaultOperationType() {
        return this.isSurface ? c3d.OperationType.Union : c3d.OperationType.Difference
    }

    private _direction!: THREE.Vector3;
    get direction(): THREE.Vector3 { return this._direction }
    set direction(direction: THREE.Vector3) { this._direction = direction }
}

export class PossiblyBooleanExtrudeFactory extends PossiblyBooleanFactory<AbstractExtrudeFactory | MultiExtrudeFactory> implements ExtrudeParams, MultiplyableFactory {
    readonly factories = [this.fantom];

    constructor(readonly bool: MultiBooleanFactory, readonly fantom: AbstractExtrudeFactory | MultiExtrudeFactory) {
        super(bool['db'], bool['materials'], bool['signals']);
    }

    get thickness() { return this.thickness1 }
    set thickness(d: number) {
        this.thickness1 = d;
        this.thickness2 = d;
    }

    @delegate.default(0) distance1!: number;
    @delegate.default(0) distance2!: number;
    @delegate.default(0) race1!: number;
    @delegate.default(0) race2!: number;
    @delegate.default(0) thickness1!: number;
    @delegate.default(0) thickness2!: number;

    @delegate.get center!: THREE.Vector3;
    @delegate.get direction!: THREE.Vector3;

    get defaultOperationType() { return this.fantom.defaultOperationType }
}

export class PossiblyBooleanFaceExtrudeFactory extends PossiblyBooleanExtrudeFactory {
    private parentItem!: visual.Solid;
    set face(face: visual.Face) {
        this.parentItem = face.parentItem;
    }
    override get targets(): visual.Solid[] {
        return super.targets;
    }
    override set targets(targets: visual.Solid[]) {
        super.targets = [this.parentItem, ...targets];
    }
}

export class MultiBooleanExtrudeFactory extends MultiGeometryFactory<PossiblyBooleanExtrudeFactory> implements ExtrudeParams {
    constructor(readonly factories: PossiblyBooleanExtrudeFactory[]) {
        super(factories[0]['db'], factories[0]['materials'], factories[0]['signals']);
        if (factories.length === 0) throw new Error('invalid precondition');
    }

    get thickness() { return this.thickness1 }
    set thickness(d: number) {
        this.thickness1 = d;
        this.thickness2 = d;
    }

    @delegate targets!: visual.Solid[];
    @delegate.default(0) distance1!: number;
    @delegate.default(0) distance2!: number;
    @delegate.default(0) race1!: number;
    @delegate.default(0) race2!: number;
    @delegate.default(0) thickness1!: number;
    @delegate.default(0) thickness2!: number;

    @delegate newBody!: boolean;
    @delegate operationType!: c3d.OperationType;
    @delegate.some get shouldRemoveOriginalItemOnCommit() { return true }
    @delegate.get isOverlapping!: boolean;

    @delegate.get center!: THREE.Vector3;
    @delegate.get direction!: THREE.Vector3;
}

export class MultiExtrudeFactory extends MultiGeometryFactory<AbstractExtrudeFactory> implements ExtrudeParams {
    constructor(readonly factories: AbstractExtrudeFactory[]) {
        super(factories[0]['db'], factories[0]['materials'], factories[0]['signals']);
        if (factories.length === 0) throw new Error('invalid precondition');
    }

    get thickness() { return this.thickness1 }
    set thickness(d: number) {
        this.thickness1 = d;
        this.thickness2 = d;
    }

    @delegate.default(0) distance1!: number;
    @delegate.default(0) distance2!: number;
    @delegate.default(0) race1!: number;
    @delegate.default(0) race2!: number;
    @delegate.default(0) thickness1!: number;
    @delegate.default(0) thickness2!: number;

    @delegate.get center!: THREE.Vector3;
    @delegate.get direction!: THREE.Vector3;

    get defaultOperationType() { return this.factories[0].defaultOperationType }
}

