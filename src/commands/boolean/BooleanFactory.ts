import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { delegate, derive } from "../../command/FactoryBuilder";
import { GeometryFactory, NoOpError, PhantomInfo } from '../../command/GeometryFactory';
import { MultiGeometryFactory } from "../../command/MultiFactory";
import { DatabaseLike, MaterialOverride, TemporaryObject } from "../../editor/DatabaseLike";
import { composeMainName, vec2vec } from '../../util/Conversion';
import { AtomicRef } from "../../util/Util";
import * as visual from '../../visual_model/VisualModel';
import { MoveParams } from "../translate/TranslateFactory";

export interface MultiBooleanLikeFactory extends GeometryFactory {
    set targets(targets: visual.Solid[]);
    set tool(target: visual.Solid | c3d.Solid);
    set tools(target: visual.Solid[] | c3d.Solid[]);

    operationType: c3d.OperationType;
}

export interface BooleanParams {
    operationType: c3d.OperationType;
    mergingFaces: boolean;
    mergingEdges: boolean;
}

export class BooleanFactory extends GeometryFactory implements BooleanParams {
    private _operationType = c3d.OperationType.Difference;
    get operationType() { return this._operationType }
    set operationType(operationType: c3d.OperationType) { this._operationType = operationType }

    mergingFaces = true;
    mergingEdges = true;

    isOverlapping = false;
    isSurface = false;

    protected _target!: { view: visual.Solid, model: c3d.Solid };
    @derive(visual.Solid) get target(): visual.Solid { throw '' }
    set target(solid: visual.Solid | c3d.Solid) { }

    protected _tools: { views: visual.Solid[], models: c3d.Solid[] } = { views: [], models: [] };
    get tools(): visual.Solid[] { return this._tools.views }
    set tools(tools: visual.Solid[] | c3d.Solid[]) {
        const models = tools[0] instanceof visual.Solid
            ? tools.map(t => this.db.lookup(t as visual.Solid))
            : tools as c3d.Solid[];
        this._tools = { views: [], models };
    }

    set tool(solid: visual.Solid | c3d.Solid) {
        this._tools.models = [solid instanceof visual.Solid ? this.db.lookup(solid) : solid];
    }

    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.BooleanSolid, this.db.version), c3d.ESides.SideNone, 0);
    protected _isOverlapping = false;

    async calculate() {
        const { _target: { model: solid }, _tools: { models: tools }, names, mergingFaces, mergingEdges } = this;

        const flags = new c3d.MergingFlags();
        flags.SetMergingFaces(mergingFaces);
        flags.SetMergingEdges(mergingEdges);

        const { result } = await c3d.ActionSolid.UnionResult_async(solid, c3d.CopyMode.Copy, tools, c3d.CopyMode.Copy, this.operationType, true, flags, names, false);
        this._isOverlapping = true;
        return result;
    }

    async calculatePhantoms(): Promise<PhantomInfo[]> {
        const result = await this.calculateToolPhantoms();
        result.push(await this.calculateTargetPhantom());
        return result;
    }

    async calculateToolPhantoms(): Promise<PhantomInfo[]> {
        const { operationType, _tools: { models, views } } = this;

        let material: MaterialOverride;
        if (operationType === c3d.OperationType.Difference) material = phantom_red
        else if (operationType === c3d.OperationType.Intersect) material = phantom_green;
        else material = phantom_blue;

        const result: PhantomInfo[] = [];
        for (const [i, phantom] of models.entries()) {
            result.push({ phantom, material, ancestor: views[i] })
        }
        return result;
    }

    async calculateTargetPhantom(): Promise<PhantomInfo> {
        const { _target: { model: solid } } = this;
        return { phantom: solid, material: phantom_blue, ancestor: this.target }
    }

    get originalItem() {
        let result = [];
        if (this.target !== undefined) result.push(this.target);
        result = result.concat(this.tools);
        return result;
    }

    get shouldRemoveOriginalItemOnCommit() {
        return true;
        //         return this._isOverlapping;

    }
}

type ToolAndTargetPhantoms = { tools: TemporaryObject[], targets: TemporaryObject[], dirty: boolean };

export class MovingBooleanFactory extends BooleanFactory implements MoveParams {
    move = new THREE.Vector3();
    pivot = new THREE.Vector3();

    override get operationType() { return super.operationType }
    override set operationType(operationType: c3d.OperationType) {
        this.phantoms.dirty();
        super.operationType = operationType;
    }

    override get target(): visual.Solid { return super.target }
    override set target(target: visual.Solid | c3d.Solid) {
        super.target = target;
        this.phantoms.dirty();
    }

    override get tools() { return super.tools }
    override set tools(tools: visual.Solid[]) {
        super.tools = tools;
        this.phantoms.dirty();
    }

    async calculate() {
        const { _target: { model: solid }, names, mergingFaces, mergingEdges, _tools: { models: toolModels, views } } = this;
        if (solid === undefined) throw new NoOpError();
        if (toolModels.length === 0) return solid;

        const tools = this.moveTools();

        const flags = new c3d.MergingFlags();
        flags.SetMergingFaces(mergingFaces);
        flags.SetMergingEdges(mergingEdges);

        try {
            const { result } = await c3d.ActionSolid.UnionResult_async(solid, c3d.CopyMode.Copy, tools, c3d.CopyMode.Copy, this.operationType, false, flags, names, false);
            this._isOverlapping = true;
            return result;
        } catch (e) {
            const error = e as { isC3dError: boolean, code: number };
            if (error.isC3dError && error.code === 25) return solid;
            else {
                const classification = await solid.SolidClassification_async(toolModels[0]);
                if (classification === c3d.ItemLocation.ByItem) return solid;
                else throw e;
            }
        }
    }

    private moveTools() {
        let tools = [];
        const { move, _tools: { models } } = this;
        if (move.manhattanLength() > 10e-6) {
            const transform = new c3d.TransformValues();
            transform.Move(vec2vec(move));
            const names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.TransformedSolid, this.db.version), c3d.ESides.SideNone, 0);
            for (const tool of models) {
                const transformed = c3d.ActionDirect.TransformedSolid(tool, c3d.CopyMode.Copy, transform, names);
                tools.push(transformed);
            }
        } else tools = models;
        return tools;
    }

    private readonly phantoms = new BooleanPhantomStrategy(this.db);
    protected async doPhantoms(abortEarly: () => boolean): Promise<TemporaryObject[]> {
        const { phantoms } = this;
        phantoms.operationType = this.operationType;
        phantoms.tools = this._tools;
        phantoms.targets = { models: [this._target.model], views: [this._target.view] };
        phantoms.move = this.move;
        const temps = await phantoms.doPhantoms(abortEarly);
        return this.showTemps(temps);
    }
}

class BooleanPhantomStrategy {
    operationType!: c3d.OperationType;
    tools!: { views: visual.Solid[], models: c3d.Solid[] };
    targets!: { views: visual.Solid[], models: c3d.Solid[] };
    move!: THREE.Vector3;

    constructor(private readonly db: DatabaseLike) { }

    async calculateToolPhantoms(): Promise<PhantomInfo[]> {
        const { operationType, tools: { models, views } } = this;

        let material: MaterialOverride;
        if (operationType === c3d.OperationType.Difference) material = phantom_red
        else if (operationType === c3d.OperationType.Intersect) material = phantom_green;
        else material = phantom_blue;

        const result: PhantomInfo[] = [];
        for (const [i, phantom] of models.entries()) {
            result.push({ phantom, material, ancestor: views[i] })
        }
        return result;
    }

    async calculateTargetPhantoms(): Promise<PhantomInfo[]> {
        return this.targets.models.map((target, i) => ({ phantom: target, material: phantom_blue, ancestor: this.targets.views[i] }));
    }

    private readonly phantoms = new AtomicRef<ToolAndTargetPhantoms | undefined>(undefined);

    async doPhantoms(abortEarly: () => boolean): Promise<TemporaryObject[]> {
        const { clock, value } = this.phantoms.get();
        if (value === undefined || value.dirty) {
            const toolInfos = await this.calculateToolPhantoms();
            const targetInfos = await this.calculateTargetPhantoms();
            const toolPromises: Promise<TemporaryObject>[] = [];
            const targetPromises: Promise<TemporaryObject>[] = [];
            for (const { phantom, material } of toolInfos) {
                toolPromises.push(this.db.addPhantom(phantom, material));
            }
            for (const { phantom, material } of targetInfos) {
                targetPromises.push(this.db.addPhantom(phantom, material));
            }
            const toolPhantoms = await Promise.all(toolPromises);
            const targetPhantoms = await Promise.all(targetPromises);
            if (value?.dirty) {
                value.tools.forEach(t => t.cancel());
                value.targets.forEach(t => t.cancel());
            }
            this.phantoms.compareAndSet(clock, { tools: toolPhantoms, targets: targetPhantoms, dirty: false });
        }
        const { tools, targets } = this.phantoms.get().value!;
        MovePhantomsOnUpdate: {
            for (const [i, phantom] of tools.entries()) {
                phantom.underlying.position.copy(this.move);
                this.tools.views[i].position.copy(this.move);
            }
        }
        return [...tools, ...targets];
    }

    dirty() {
        const phantoms = this.phantoms.get().value;
        if (phantoms !== undefined) {
            phantoms.dirty = true;
        }
    }
}

export class MultiBooleanFactory extends MultiGeometryFactory<MovingBooleanFactory> implements BooleanParams, MoveParams {
    @delegate.default(new THREE.Vector3()) move!: THREE.Vector3;
    @delegate.default(new THREE.Vector3()) pivot!: THREE.Vector3;
    @delegate.default(true) mergingFaces!: boolean;
    @delegate.default(true) mergingEdges!: boolean;

    isOverlapping = false;
    isSurface = false;
    set tool(solid: visual.Solid | c3d.Solid) {
        this._tools.models = [solid instanceof visual.Solid ? this.db.lookup(solid) : solid];
    }

    private _operationType = c3d.OperationType.Difference;
    get operationType() { return this._operationType }
    set operationType(operationType: c3d.OperationType) {
        this._operationType = operationType;
        for (const factory of this.factories) factory.operationType = operationType;
        this.phantoms.dirty();
    }

    private _targets: { views: visual.Solid[], models: c3d.Solid[] } = { views: [], models: [] };
    @delegate.update
    get targets() { return this._targets.views }
    set targets(targets: visual.Solid[]) {
        for (const factory of this.factories) factory.cancel();
        const models = targets.map(t => this.db.lookup(t));
        this._targets = { views: targets, models };
        const individuals = [];
        for (const target of targets) {
            const individual = new MovingBooleanFactory(this.db, this.materials, this.signals);
            individual.target = target;
            individual['_tools'] = this._tools;
            individuals.push(individual);
        }
        this.factories = individuals;
        this.phantoms.dirty();
    }

    private _tools: { views: visual.Solid[], models: c3d.Solid[] } = { views: [], models: [] };
    get tools(): visual.Solid[] { return this._tools.views }
    set tools(tools: visual.Solid[] | c3d.Solid[]) {
        if (tools[0] instanceof visual.Solid) {
            const views = tools as visual.Solid[];
            const models = views.map(t => this.db.lookup(t));
            for (const factory of this.factories) factory['_tools'] = { models, views };
            this._tools = { views, models };
        } else {
            const models = tools as c3d.Solid[];
            for (const factory of this.factories) factory['_tools'] = { models, views: [] };
            this._tools = { views: [], models };
        }
        this.phantoms.dirty();
    }

    private readonly phantoms = new BooleanPhantomStrategy(this.db);
    protected override async doPhantoms(abortEarly: () => boolean): Promise<TemporaryObject[]> {
        const { phantoms } = this;
        phantoms.operationType = this.operationType;
        phantoms.tools = this._tools;
        phantoms.targets = this._targets;
        phantoms.move = this.move;
        const temps = await phantoms.doPhantoms(abortEarly);
        return this.showTemps(temps);
    }

    protected get originalItem(): visual.Item[] {
        return [...this._targets.views, ...this._tools.views];
    }

    private readonly unionSingleton = new MovingBooleanFactory(this.db, this.materials, this.signals);

    async calculate() {
        const { operationType, _targets: { models: targets }, _tools: { models: tools } } = this;
        if (targets.length === 0) return [];
        if (tools.length === 0) return targets;

        if (operationType === c3d.OperationType.Union) {
            const { unionSingleton } = this;
            unionSingleton.operationType = operationType;
            const [first, ...rest] = targets;
            unionSingleton.target = first;
            unionSingleton['_tools'] = { models: [...tools, ...rest], views: [] };
            return [await unionSingleton.calculate()];
        } else {
            return super.calculate();
        }
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

const surface_red = mesh_red.clone();
surface_red.side = THREE.DoubleSide;

export const phantom_red: MaterialOverride = {
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

export const phantom_green: MaterialOverride = {
    mesh: mesh_green
}


const mesh_blue = new THREE.MeshBasicMaterial();
mesh_blue.color.setHex(0x0000ff);
mesh_blue.opacity = 0.1;
mesh_blue.transparent = true;
mesh_blue.fog = false;
mesh_blue.polygonOffset = true;
mesh_blue.polygonOffsetFactor = 0.1;
mesh_blue.polygonOffsetUnits = 1;

export const phantom_blue: MaterialOverride = {
    mesh: mesh_blue
}
