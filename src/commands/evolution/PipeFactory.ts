import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { delegate } from '../../command/FactoryBuilder';
import { GeometryFactory, PhantomInfo } from '../../command/GeometryFactory';
import { MaterialOverride } from "../../editor/DatabaseLike";
import { composeMainName, inst2curve, point2point, toArray, unit, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { BooleanFactory, MultiBooleanFactory, phantom_blue, phantom_green, phantom_red } from '../boolean/BooleanFactory';
import { PossiblyBooleanFactory } from '../boolean/PossiblyBooleanFactory';
import { SweptParams } from "./RevolutionFactory";

export interface PipeParams extends SweptParams {
    sectionSize: number;
    vertexCount: number;
    angle: number;
    degrees: number;
}

export class PipeFactory extends GeometryFactory implements PipeParams {
    sectionSize = 0.1;
    thickness1 = 0;
    thickness2 = 0;
    set thickness(thickness: number) {
        this.thickness1 = this.thickness2 = Math.max(0, thickness);
    }

    angle = 0;
    get degrees() { return THREE.MathUtils.radToDeg(this.angle) }
    set degrees(degrees: number) {
        this.angle = THREE.MathUtils.degToRad(degrees);
    }

    private _vertexCount = 0;

    get vertexCount() { return this._vertexCount }
    set vertexCount(count: number) {
        count = Math.floor(Math.max(0, count));
        switch (count) {
            case 2: count = 3; break;
        }
        this._vertexCount = count;
    }

    private placement!: c3d.Placement3D;
    protected _spine!: { view: visual.SpaceInstance<visual.Curve3D>; model: c3d.Curve3D; };
    get spine(): visual.SpaceInstance<visual.Curve3D> { return this._spine.view; }
    set spine(spine: visual.SpaceInstance<visual.Curve3D> | c3d.Curve3D) {
        if (spine instanceof visual.SpaceInstance) {
            const model = inst2curve(this.db.lookup(spine))!;
            this.placement = getPlacement(model);
            this._spine = { view: spine, model };
        } else {
            this.placement = getPlacement(spine);
            this._spine = { view: undefined as any, model: spine };
        }

        function getPlacement(model: c3d.Curve3D) {
            const tmin = model.GetTMin();
            const tangent = model.Tangent(tmin);
            const point = model.PointOn(tmin);
            const placement = new c3d.Placement3D(point, tangent, false);
            return placement;
        }
    }

    get origin() { return point2point(this.placement.GetOrigin()) }
    get direction() { return vec2vec(this.placement.GetAxisZ()) }

    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveRevolutionSolid, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { _spine: { model: spine }, placement, names, sectionSize, thickness1, thickness2, vertexCount, angle } = this;
        const cs = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const ns = new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0);

        const polygon = c3d.ActionCurve.RegularPolygon(new c3d.CartPoint(0, 0), new c3d.CartPoint(unit(sectionSize), 0), vertexCount, true);

        const rotated = new c3d.Placement3D(placement);
        rotated.Rotate(new c3d.Axis3D(placement.GetOrigin(), placement.GetAxisZ()), angle);

        const sweptData = new c3d.SweptData(rotated, new c3d.Contour([polygon], false));

        const params = new c3d.EvolutionValues();
        params.shellClosed = true;
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);

        return c3d.ActionSolid.EvolutionSolid_async(sweptData, spine, params, names, cs, ns);
    }
}

export class PossiblyBooleanPipeFactory extends PossiblyBooleanFactory<PipeFactory> implements PipeParams {
    readonly fantom = new PipeFactory(this.db, this.materials, this.signals);
    protected bool = new MultiBooleanFactory(this.db, this.materials, this.signals);
    readonly factories = [this.fantom];

    @delegate.default(0.1) sectionSize!: number;
    @delegate.default(0) thickness1!: number;
    @delegate.default(0) thickness2!: number;
    @delegate.default(0) angle!: number;

    @delegate.get vertexCount!: number;
    @delegate.get degrees!: number;
    @delegate.get thickness!: number;

    @delegate spine!: visual.SpaceInstance<visual.Curve3D>;

    @delegate.get origin!: THREE.Vector3;
    @delegate.get direction!: THREE.Vector3;

    // NOTE: the following functions don't check for intersection, and therefore are faster in some particularly
    // nasty cases
    
    async calculatePhantoms(): Promise<PhantomInfo[]> {
        if (this.targets.length === 0 || this.newBody) return [];

        let material: MaterialOverride;
        if (this.operationType === c3d.OperationType.Difference)
            material = phantom_red;
        else if (this.operationType === c3d.OperationType.Intersect)
            material = phantom_green;
        else
            material = phantom_blue;

        const phantoms = toArray(await this.fantom.calculate()) as c3d.Solid[];
        return phantoms.map(phantom => ({ phantom, material }));
    }

    async calculate() {
        const phantoms = toArray(await this.fantom.calculate()) as c3d.Solid[];
        if (this.targets.length === 0 || this.newBody) return phantoms;
        this._isOverlapping = true; this._isSurface = false;

        if (!this.newBody) {
            this.bool.operationType = this.operationType;
            this.bool.tools = phantoms;
            const result = await this.bool.calculate() as c3d.Solid[];
            return result;
        } else {
            return phantoms;
        }
    }
}