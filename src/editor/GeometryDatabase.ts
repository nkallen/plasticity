import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import { Measure } from "../components/stats/Measure";
import { unit } from '../util/Conversion';
import { SequentialExecutor } from '../util/SequentialExecutor';
import { GConstructor } from '../util/Util';
import * as visual from '../visual_model/VisualModel';
import * as build from '../visual_model/VisualModelBuilder';
import { Agent, ControlPointData, DatabaseLike, MaterialOverride, TemporaryObject, TopologyData } from './DatabaseLike';
import { EditorSignals } from './EditorSignals';
import { GeometryMemento, MementoOriginator } from './History';
import MaterialDatabase from './MaterialDatabase';
import { MeshCreator } from './MeshCreator';
import { SolidCopier, SolidCopierPool } from './SolidCopier';

const mesh_precision_distance: [number, number][] = [[unit(0.05), 1000], [unit(0.0009), 1]];
const other_precision_distance: [number, number][] = [[unit(0.0005), 1]];
const temporary_precision_distance: [number, number][] = [[unit(0.003), 1]];
const formNote = new c3d.FormNote(true, true, false, false, false);

type Builder = build.SpaceInstanceBuilder<visual.Curve3D | visual.Surface> | build.PlaneInstanceBuilder<visual.Region> | build.SolidBuilder;

export class GeometryDatabase implements DatabaseLike, MementoOriginator<GeometryMemento> {
    readonly queue = new SequentialExecutor();

    readonly temporaryObjects = new THREE.Scene();
    readonly phantomObjects = new THREE.Scene();

    private readonly geometryModel = new Map<c3d.SimpleName, { view: visual.Item, model: c3d.Item }>();
    private readonly version2id = new Map<c3d.SimpleName, c3d.SimpleName>();
    private readonly id2version = new Map<c3d.SimpleName, c3d.SimpleName>();
    private readonly automatics = new Set<c3d.SimpleName>();
    private readonly topologyModel = new Map<string, TopologyData>();
    private readonly controlPointModel = new Map<string, ControlPointData>();

    constructor(
        private readonly meshCreator: MeshCreator,
        private readonly copier: SolidCopier,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals
    ) { }

    private positiveCounter = 1; // ids must be positive to distinguish real objects from temps/phantoms
    private negativeCounter = -1;

    get version() { return this.positiveCounter }

    async addItem(model: c3d.Solid, agent?: Agent, name?: c3d.SimpleName): Promise<visual.Solid>;
    async addItem(model: c3d.SpaceInstance, agent?: Agent, name?: c3d.SimpleName): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async addItem(model: c3d.PlaneInstance, agent?: Agent, name?: c3d.SimpleName): Promise<visual.PlaneInstance<visual.Region>>;
    async addItem(model: c3d.Item, agent?: Agent, name?: c3d.SimpleName): Promise<visual.Item>;
    async addItem(model: c3d.Item, agent: Agent = 'user', name?: c3d.SimpleName): Promise<visual.Item> {
        return this.queue.enqueue(async () => {
            const result = await this.insertItem(model, agent, name);
            this.version2id.set(result.simpleName, result.simpleName);
            this.id2version.set(result.simpleName, result.simpleName);
            this.signals.objectAdded.dispatch([result, agent]);
            return result;
        });
    }

    async replaceItem(from: visual.Solid, model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    async replaceItem<T extends visual.SpaceItem>(from: visual.SpaceInstance<T>, model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async replaceItem<T extends visual.PlaneItem>(from: visual.PlaneInstance<T>, model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    async replaceItem(from: visual.Item, model: c3d.Item, agent?: Agent): Promise<visual.Item>;
    async replaceItem(from: visual.Item, model: c3d.Item): Promise<visual.Item> {
        return this.queue.enqueue(async () => {
            const agent = 'user';
            const name = this.version2id.get(from.simpleName)!;

            const to = await this.insertItem(model, agent);
            this.version2id.set(to.simpleName, name);
            this.id2version.set(name, to.simpleName);

            this._removeItem(from);
            this.version2id.delete(from.simpleName);

            this.signals.objectReplaced.dispatch({ from, to });
            return to;
        });
    }

    async removeItem(view: visual.Item, agent: Agent = 'user'): Promise<void> {
        return this.queue.enqueue(async () => {
            const result = this._removeItem(view);
            this.signals.objectRemoved.dispatch([view, agent]);

            const old = this.version2id.get(view.simpleName)!;
            this.version2id.delete(view.simpleName);
            this.id2version.delete(old);

            return result;
        });
    }

    private async insertItem(model: c3d.Item, agent: Agent, name?: c3d.SimpleName): Promise<visual.Item> {
        if (name === undefined) name = this.positiveCounter++;
        else (this.positiveCounter = Math.max(this.positiveCounter, name + 1));

        const builder = await this.meshes(model, name, this.precisionAndDistanceFor(model), true); // TODO: it would be nice to move this out of the queue but tests fail
        const view = builder.build(name, this.topologyModel, this.controlPointModel);
        view.userData.simpleName = name;

        this.geometryModel.set(name, { view, model });
        if (agent === 'automatic') this.automatics.add(name);

        return view;
    }

    private precisionAndDistanceFor(item: c3d.Item, mode: 'real' | 'temporary' = 'real'): [number, number][] {
        if (item.IsA() === c3d.SpaceType.Solid) {
            return mode === 'real' ? mesh_precision_distance : temporary_precision_distance;
        } else {
            return other_precision_distance;
        }
    }

    optimization<T>(from: visual.Item, fast: () => T, ifDisallowed: () => T): T {
        return fast();
    }

    async addPhantom(object: c3d.Item, materials?: MaterialOverride): Promise<TemporaryObject> {
        return this._addTemporaryItem(object, undefined, materials, this.phantomObjects);
    }

    async replaceWithTemporaryItem(from: visual.Item, to: c3d.Item,): Promise<TemporaryObject> {
        const temp = await this._addTemporaryItem(to, from);
        const view = temp.underlying as visual.Item;
        this.signals.temporaryObjectAdded.dispatch({ view, ancestor: from });
        return temp;
    }

    async addTemporaryItem(model: c3d.Item): Promise<TemporaryObject> {
        const temp = await this._addTemporaryItem(model);
        const view = temp.underlying as visual.Item;
        this.signals.temporaryObjectAdded.dispatch({ view });
        return temp;
    }

    private async _addTemporaryItem(model: c3d.Item, ancestor?: visual.Item, materials?: MaterialOverride, into = this.temporaryObjects): Promise<TemporaryObject> {
        const { signals } = this;
        const tempId = this.negativeCounter--;
        const builder = await this.meshes(
            model,
            tempId,
            this.precisionAndDistanceFor(model, 'temporary'),
            false,
            materials);
        const view = builder.build(tempId);
        into.add(view);

        view.visible = false;
        return {
            underlying: view,
            show() {
                view.visible = true;
                if (ancestor !== undefined) ancestor.visible = false;
            },
            hide() {
                view.visible = false;
                if (ancestor !== undefined) ancestor.visible = true;
            },
            cancel() {
                view.dispose();
                into.remove(view);
                if (ancestor !== undefined) ancestor.visible = true;
                signals.objectRemoved.dispatch([view, 'automatic']); // TODO: investigate if this is necessary
            }
        }
    }

    clearTemporaryObjects() {
        this.temporaryObjects.clear();
        this.phantomObjects.clear();
    }

    private _removeItem(view: visual.Item) {
        const simpleName = view.simpleName;
        this.geometryModel.delete(simpleName);
        this.removeTopologyItems(view);
        this.removeControlPoints(view);
        this.automatics.delete(simpleName);
    }

    lookupItemById(id: c3d.SimpleName): { view: visual.Item, model: c3d.Item } {
        const result = this.geometryModel.get(id)
        if (result === undefined) throw new Error(`invalid precondition: object ${id} missing from geometry model`);
        return result;
    }

    lookup(object: visual.Solid): c3d.Solid;
    lookup(object: visual.SpaceInstance<visual.Curve3D>): c3d.SpaceInstance;
    lookup(object: visual.PlaneInstance<visual.Region>): c3d.PlaneInstance;
    lookup(object: visual.Item): c3d.Item;
    lookup(object: visual.Item): c3d.Item {
        return this.lookupItemById(object.simpleName).model;
    }

    hasTopologyItem(id: string): boolean {
        return this.topologyModel.has(id);
    }

    lookupTopologyItemById(id: string): TopologyData {
        const result = this.topologyModel.get(id);
        if (result === undefined) throw new Error(`invalid precondition: object ${id} missing from topology model`);
        return result;
    }

    lookupTopologyItem(object: visual.Face): c3d.Face;
    lookupTopologyItem(object: visual.CurveEdge): c3d.CurveEdge;
    lookupTopologyItem(object: visual.Edge | visual.Face): c3d.TopologyItem {
        return this.lookupTopologyItemById(object.simpleName).model;
    }

    find<T extends visual.PlaneInstance<visual.Region>>(klass: GConstructor<T>, includeAutomatics?: boolean): { view: T, model: c3d.PlaneInstance }[];
    find<T extends visual.SpaceInstance<visual.Curve3D>>(klass: GConstructor<T>, includeAutomatics?: boolean): { view: T, model: c3d.SpaceInstance }[];
    find<T extends visual.Solid>(klass: GConstructor<T>, includeAutomatics?: boolean): { view: T, model: c3d.Solid }[];
    find<T extends visual.Solid>(klass: undefined, includeAutomatics?: boolean): { view: T, model: c3d.Solid }[];
    find<T extends visual.Item>(klass?: GConstructor<T>, includeAutomatics?: boolean): { view: T, model: c3d.Item }[] {
        const automatics = this.automatics;
        const result: { view: visual.Item, model: c3d.Item }[] = [];
        if (klass === undefined) {
            for (const [id, { view, model }] of this.geometryModel.entries()) {
                if (!includeAutomatics && automatics.has(id)) continue;
                result.push({ view, model });
            }
        } else {
            for (const [id, { view, model }] of this.geometryModel.entries()) {
                if (!includeAutomatics && automatics.has(id)) continue;
                if (view instanceof klass) result.push({ view, model });
            }
        }
        return result as { view: T, model: c3d.Item }[];
    }

    findAll(includeAutomatics?: boolean): { view: visual.Item, model: c3d.Solid }[] {
        return this.find(undefined, includeAutomatics);
    }


    async duplicate(model: visual.Solid): Promise<visual.Solid>;
    async duplicate<T extends visual.SpaceItem>(model: visual.SpaceInstance<T>): Promise<visual.SpaceInstance<T>>;
    async duplicate<T extends visual.PlaneItem>(model: visual.PlaneInstance<T>): Promise<visual.PlaneInstance<T>>;
    async duplicate(edge: visual.CurveEdge): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async duplicate(item: visual.Item | visual.CurveEdge): Promise<visual.Item> {
        if (item instanceof visual.Item) {
            const model = this.lookup(item);
            const dup = model.Duplicate().Cast<c3d.Item>(model.IsA());
            return this.addItem(dup); // FIXME: we shouldn't duplicate the geometry
        } else if (item instanceof visual.TopologyItem) {
            const edge = this.lookupTopologyItem(item);
            const curve = edge.MakeCurve()!;
            return this.addItem(new c3d.SpaceInstance(curve));
        } else throw new Error("unsupported duplication");
    }

    get items() {
        return [...this.geometryModel.values()];
    }

    private async meshes(obj: c3d.Item, id: c3d.SimpleName, precision_distance: [number, number][], includeMetadata: boolean, materials?: MaterialOverride): Promise<build.Builder<visual.SpaceInstance<visual.Curve3D | visual.Surface> | visual.Solid | visual.PlaneInstance<visual.Region>>> {
        let builder;
        switch (obj.IsA()) {
            case c3d.SpaceType.SpaceInstance:
                builder = new build.SpaceInstanceBuilder<visual.Curve3D | visual.Surface>();
                break;
            case c3d.SpaceType.PlaneInstance:
                builder = new build.PlaneInstanceBuilder<visual.Region>();
                break;
            case c3d.SpaceType.Solid:
                builder = new build.SolidBuilder();
                break;
            default:
                throw new Error(`type ${c3d.SpaceType[obj.IsA()]} not yet supported`);
        }

        const promises = [];
        for (const [precision, distance] of precision_distance) {
            promises.push(this.object2mesh(builder, obj, id, precision, distance, includeMetadata, materials));
        }
        await Promise.all(promises);

        return builder;
    }

    private async object2mesh(builder: Builder, obj: c3d.Item, id: c3d.SimpleName, sag: number, distance: number, includeMetadata: boolean, materials?: MaterialOverride): Promise<void> {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const stats = Measure.get("create-mesh");
        stats.begin();
        const item = await this.meshCreator.create(obj, stepData, formNote, obj.IsA() === c3d.SpaceType.Solid, includeMetadata);
        stats.end();

        switch (obj.IsA()) {
            case c3d.SpaceType.SpaceInstance: {
                const instance = obj as c3d.SpaceInstance;
                const underlying = instance.GetSpaceItem();
                if (underlying === null) throw new Error("invalid precondition");
                switch (underlying.Family()) {
                    case c3d.SpaceType.Curve3D:
                        builder = builder as build.SpaceInstanceBuilder<visual.Curve3D>;
                        if (item.edges.length === 0) throw new Error(`invalid precondition: no edges`);

                        const lineMaterial = materials?.line ?? this.materials.line(instance);
                        const pointMaterial = materials?.controlPoint ?? this.materials.controlPoint();

                        const segments = new build.CurveSegmentGroupBuilder();
                        for (const edge of item.edges) {
                            segments.add(edge, id, materials?.line ?? lineMaterial, materials?.lineDashed ?? this.materials.lineDashed());
                        }

                        const points = build.ControlPointGroupBuilder.build(underlying, id, pointMaterial);
                        const curve = visual.Curve3D.build(segments, points);
                        builder.add(curve, distance);
                        break;
                    case c3d.SpaceType.Surface:
                        builder = builder as build.SpaceInstanceBuilder<visual.Surface>;
                        if (item.faces.length != 1) throw new Error("Invalid precondition");
                        const grid = item.faces[0];
                        const material = materials?.surface ?? this.materials.surface(instance);
                        const surface = visual.Surface.build(grid, material);
                        builder.add(surface, distance);
                        break;
                    default: throw new Error("invalid precondition")
                }
                break;
            }
            case c3d.SpaceType.PlaneInstance: {
                const instance = builder as build.PlaneInstanceBuilder<visual.Region>;
                if (item.faces.length != 1) throw new Error("Invalid precondition: grid with length: " + item.faces.length);
                const grid = item.faces[0];
                const material = materials?.region ?? this.materials.region();
                instance.add(grid, material);
                break;
            }
            // case c3d.SpaceType.Point3D: {
            //     const apexes = mesh.GetApexes();
            //     const geometry = new THREE.BufferGeometry();
            //     geometry.setAttribute('position', new THREE.Float32BufferAttribute(apexes, 3));
            //     const points = new THREE.Points(geometry, this.materials.point(obj));
            //     return points;
            // }
            case c3d.SpaceType.Solid: {
                const solid = builder as build.SolidBuilder;
                const edges = new build.CurveEdgeGroupBuilder();
                const lineMaterial = materials?.line ?? this.materials.line();
                const lineDashed = this.materials.lineDashed();
                for (const edge of item.edges) {
                    edges.add(edge, id, lineMaterial, lineDashed);
                }

                const material = materials?.mesh ?? this.materials.mesh();
                const faces = new build.FaceGroupBuilder();
                for (const grid of item.faces) {
                    faces.add(grid, id, material);
                }
                solid.add(edges, faces, distance);
                break;
            }
            default: throw new Error("type not yet supported");
        }
    }

    private removeTopologyItems(parent: visual.Item) {
        const { topologyModel } = this;
        if (parent instanceof visual.Solid) {
            for (const face of parent.allFaces) topologyModel.delete(face.simpleName);
            for (const edge of parent.allFaces) topologyModel.delete(edge.simpleName);
        }
    }

    lookupControlPointById(id: string): ControlPointData {
        const result = this.controlPointModel.get(id);
        if (result === undefined) throw new Error(`invalid precondition: object ${id} missing from control point model`);
        return result;
    }

    private removeControlPoints(parent: visual.Item) {
        parent.traverse(o => {
            if (o instanceof visual.ControlPointGroup) {
                for (const p of o) this.controlPointModel.delete(p.simpleName);
            }
        })
    }

    lookupId(version: c3d.SimpleName) {
        return this.version2id.get(version);
    }

    lookupById(name: c3d.SimpleName) {
        return this.lookupItemById(this.id2version.get(name)!);
    }

    pool(solid: c3d.Solid, size: number): SolidCopierPool {
        return this.copier.pool(solid, size);
    }

    saveToMemento(): GeometryMemento {
        return new GeometryMemento(
            new Map(this.geometryModel),
            new Map(this.version2id),
            new Map(this.id2version),
            new Map(this.topologyModel),
            new Map(this.controlPointModel),
            new Set(this.automatics));
    }

    restoreFromMemento(m: GeometryMemento) {
        (this.geometryModel as GeometryDatabase['geometryModel']) = new Map(m.geometryModel);
        (this.version2id as GeometryDatabase['version2id']) = new Map(m.version2id);
        (this.id2version as GeometryDatabase['id2version']) = new Map(m.id2version);
        (this.topologyModel as GeometryDatabase['topologyModel']) = new Map(m.topologyModel);
        (this.controlPointModel as GeometryDatabase['controlPointModel']) = new Map(m.controlPointModel);
        (this.automatics as GeometryDatabase['automatics']) = new Set(m.automatics);
    }

    async serialize(): Promise<Buffer> {
        return this.saveToMemento().serialize();
    }

    async deserialize(data: Buffer): Promise<visual.Item[]> {
        const everything = await c3d.Writer.ReadItems_async(data);
        return this.load(everything);
    }

    async load(model: c3d.Model, preserveNames = false): Promise<visual.Item[]> {
        const promises: Promise<visual.Item>[] = [];
        const loadItems = (stack: c3d.Item[]) => {
            while (stack.length > 0) {
                const item = stack.shift()!;
                const cast = item.Cast<c3d.Item>(item.IsA());
                if (cast instanceof c3d.Assembly) {
                    stack.push(...cast.GetItems());
                } else if (cast instanceof c3d.Instance) {
                    stack.push(cast.GetItem()!);
                } else {
                    const name = preserveNames ? item.GetItemName() : undefined;
                    promises.push(this.addItem(cast, 'user', name));
                }
            }
        }

        loadItems(model.GetItems());
        return Promise.all(promises);
    }

    validate() {
        console.assert(this.id2version.size === this.version2id.size, "maps should have same size", this.id2version, this.version2id);
    }

    debug() {
        console.group("GeometryDatabase");
        console.info("Version: ", this.version);
        const { geometryModel, topologyModel, controlPointModel, id2version: name2version, version2id: version2name } = this;
        console.group("geometryModel");
        console.table([...geometryModel].map(([name]) => { return { name } }));
        console.groupEnd();
        console.group("topologyModel");
        console.table([...topologyModel].map(([name]) => { return { name } }));
        console.groupEnd();
        console.group("controlPointModel");
        console.table([...controlPointModel].map(([name, stack]) => { return { name } }));
        console.groupEnd();
        console.group("name2version");
        console.table([...name2version].map(([name, version]) => { return { name, version } }));
        console.groupEnd();
        console.group("version2name");
        console.table([...version2name].map(([version, name]) => { return { version, name } }));
        console.groupEnd();
        console.groupEnd();
    }
}

export type Replacement = { from: visual.Item, to: visual.Item }
