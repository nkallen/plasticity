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
import { TypeManager } from './TypeManager';

const mesh_precision_distance: [number, number][] = [[unit(0.05), 1000], [unit(0.001), 1]];
const other_precision_distance: [number, number][] = [[unit(0.0005), 1]];
const temporary_precision_distance: [number, number][] = [[unit(0.004), 1]];
const formNote = new c3d.FormNote(true, true, false, false, false);

type Builder = build.SpaceInstanceBuilder<visual.Curve3D | visual.Surface> | build.PlaneInstanceBuilder<visual.Region> | build.SolidBuilder;

export class GeometryDatabase implements DatabaseLike, MementoOriginator<GeometryMemento> {
    readonly queue = new SequentialExecutor();
    readonly types = new TypeManager(this.signals);

    readonly temporaryObjects = new THREE.Scene();
    readonly phantomObjects = new THREE.Scene();

    private readonly geometryModel = new Map<c3d.SimpleName, { view: visual.Item, model: c3d.Item }>();
    private readonly topologyModel = new Map<string, TopologyData>();
    private readonly controlPointModel = new Map<string, ControlPointData>();
    private readonly hidden = new Set<c3d.SimpleName>();
    private readonly invisible = new Set<c3d.SimpleName>();
    private readonly automatics = new Set<c3d.SimpleName>();
    private readonly unselectable = new Set<c3d.SimpleName>();

    constructor(
        private readonly meshCreator: MeshCreator,
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
            return this.insertItem(model, agent, name);
        });
    }

    async replaceItem(from: visual.Solid, model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    async replaceItem<T extends visual.SpaceItem>(from: visual.SpaceInstance<T>, model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async replaceItem<T extends visual.PlaneItem>(from: visual.PlaneInstance<T>, model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    async replaceItem(from: visual.Item, model: c3d.Item, agent?: Agent): Promise<visual.Item>;
    async replaceItem(from: visual.Item, model: c3d.Item): Promise<visual.Item> {
        return this.queue.enqueue(async () => {
            const to = await this.insertItem(model, 'user');
            this._removeItem(from, 'user');
            return to;
        });
    }

    private async insertItem(model: c3d.Item, agent: Agent, name?: c3d.SimpleName): Promise<visual.Item> {
        if (name === undefined) name = this.positiveCounter++;
        else (this.positiveCounter = Math.max(this.positiveCounter, name + 1));

        const builder = await this.meshes(model, name, formNote, this.precisionAndDistanceFor(model)); // TODO: it would be nice to move this out of the queue but tests fail
        const view = builder.build(name, this.topologyModel, this.controlPointModel);
        view.userData.simpleName = name;

        this.geometryModel.set(name, { view, model });
        if (agent === 'automatic') this.automatics.add(name);

        this.signals.sceneGraphChanged.dispatch();
        this.signals.objectAdded.dispatch([view, agent]);
        return view;
    }

    private precisionAndDistanceFor(item: c3d.Item, mode: 'real' | 'temporary' = 'real'): [number, number][] {
        if (item.IsA() === c3d.SpaceType.Solid) {
            return mode === 'real' ? mesh_precision_distance : temporary_precision_distance;
        } else {
            return other_precision_distance;
        }
    }

    async addPhantom(object: c3d.Item, materials?: MaterialOverride): Promise<TemporaryObject> {
        return this.addTemporaryItem(object, undefined, materials, this.phantomObjects);
    }

    async replaceWithTemporaryItem(from: visual.Item, to: c3d.Item,): Promise<TemporaryObject> {
        return this.addTemporaryItem(to, from);
    }

    optimization<T>(from: visual.Item, fast: () => T, ifDisallowed: () => T): T {
        return fast();
    }

    async addTemporaryItem(model: c3d.Item, ancestor?: visual.Item, materials?: MaterialOverride, into = this.temporaryObjects): Promise<TemporaryObject> {
        const { signals } = this;
        const tempId = this.negativeCounter--;
        const builder = await this.meshes(
            model,
            tempId,
            formNote,
            this.precisionAndDistanceFor(model, 'temporary'),
            materials,
            ancestor);
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
                signals.objectRemoved.dispatch([view, 'automatic']);
            }
        }
    }

    clearTemporaryObjects() {
        this.temporaryObjects.clear();
        this.phantomObjects.clear();
    }

    async removeItem(view: visual.Item, agent: Agent = 'user'): Promise<void> {
        return this.queue.enqueue(async () => {
            return this._removeItem(view, agent);
        });
    }

    private async _removeItem(view: visual.Item, agent: Agent = 'user') {
        const simpleName = view.simpleName;
        this.geometryModel.delete(simpleName);
        this.removeTopologyItems(view);
        this.removeControlPoints(view);
        this.hidden.delete(simpleName);
        this.automatics.delete(simpleName);

        this.signals.objectRemoved.dispatch([view, agent]);
        this.signals.sceneGraphChanged.dispatch();
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
            return this.addItem(dup); // FIXME we shouldn't duplicate the geometry
        } else if (item instanceof visual.TopologyItem) {
            const edge = this.lookupTopologyItem(item);
            const curve = edge.MakeCurve()!;
            return this.addItem(new c3d.SpaceInstance(curve));
        } else throw new Error("unsupported duplication");
    }

    get visibleObjects(): visual.Item[] {
        const { geometryModel, hidden, invisible, types } = this;
        const difference = [];
        for (const { view } of geometryModel.values()) {
            if (hidden.has(view.simpleName)) continue;
            if (invisible.has(view.simpleName)) continue;
            if (!types.isEnabled(view)) continue;
            difference.push(view);
        }
        return difference;
    }

    get selectableObjects(): visual.Item[] {
        const { unselectable } = this;
        return this.visibleObjects.filter(i => !unselectable.has(i.simpleName));
    }

    private async meshes(obj: c3d.Item, id: c3d.SimpleName, note: c3d.FormNote, precision_distance: [number, number][], materials?: MaterialOverride, ancestor?: visual.Item): Promise<build.Builder<visual.SpaceInstance<visual.Curve3D | visual.Surface> | visual.Solid | visual.PlaneInstance<visual.Region>>> {
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
            promises.push(this.object2mesh(builder, obj, id, precision, note, distance, materials, ancestor));
        }
        await Promise.all(promises);

        return builder;
    }

    private async object2mesh(builder: Builder, obj: c3d.Item, id: c3d.SimpleName, sag: number, note: c3d.FormNote, distance?: number, materials?: MaterialOverride, ancestor?: visual.Item): Promise<void> {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const stats = Measure.get("create-mesh");
        stats.begin();
        const item = await this.meshCreator.create(obj, stepData, note, obj.IsA() === c3d.SpaceType.Solid, ancestor && this.lookup(ancestor));
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

                const faces = new build.FaceGroupBuilder();
                for (const grid of item.faces) {
                    const material = materials?.mesh ?? this.materials.mesh(grid);
                    faces.add(grid, id, material);
                }
                solid.add(edges, faces, distance);
                break;
            }
            default: throw new Error("type not yet supported");
        }
    }

    private removeTopologyItems(parent: visual.Item) {
        parent.traverse(o => {
            if (o instanceof visual.TopologyItem) {
                this.topologyModel.delete(o.simpleName);
            }
        })
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

    isSelectable(item: visual.Item): boolean {
        return !this.unselectable.has(item.simpleName);
    }

    makeSelectable(item: visual.Item, newValue: boolean) {
        const { unselectable } = this;
        const oldValue = !unselectable.has(item.simpleName);
        if (newValue) {
            if (oldValue) return;
            unselectable.delete(item.simpleName);
            this.signals.objectSelectable.dispatch(item);
        } else {
            if (!oldValue) return;
            unselectable.add(item.simpleName);
            this.signals.objectUnselectable.dispatch(item);
        }
    }

    isHidden(item: visual.Item): boolean {
        return this.hidden.has(item.simpleName);
    }

    async makeHidden(item: visual.Item, newValue: boolean) {
        const { hidden } = this;
        const oldValue = hidden.has(item.simpleName);
        if (newValue) {
            if (oldValue) return;
            hidden.add(item.simpleName);
            this.signals.objectHidden.dispatch(item);
        } else {
            if (!oldValue) return;
            hidden.delete(item.simpleName);
            this.signals.objectUnhidden.dispatch(item);
        }
    }

    async makeVisible(item: visual.Item, newValue: boolean) {
        const { invisible } = this;
        const oldValue = !invisible.has(item.simpleName);
        if (newValue) {
            if (oldValue) return;
            invisible.delete(item.simpleName);
            this.signals.objectUnhidden.dispatch(item);
        } else {
            if (!oldValue) return;
            invisible.add(item.simpleName);
            this.signals.objectHidden.dispatch(item);
        }
    }

    isVisible(item: visual.Item): boolean {
        return !this.invisible.has(item.simpleName);
    }

    async unhideAll(): Promise<visual.Item[]> {
        const hidden = [...this.hidden].map(id => this.lookupItemById(id));
        this.hidden.clear();
        const views = hidden.map(h => h.view);
        for (const view of views) this.signals.objectUnhidden.dispatch(view);
        return views;
    }

    saveToMemento(): GeometryMemento {
        return new GeometryMemento(
            new Map(this.geometryModel),
            new Map(this.topologyModel),
            new Map(this.controlPointModel),
            new Set(this.hidden),
            new Set(this.invisible),
            new Set(this.automatics));
    }

    restoreFromMemento(m: GeometryMemento) {
        (this.geometryModel as GeometryDatabase['geometryModel']) = new Map(m.geometryModel);
        (this.topologyModel as GeometryDatabase['topologyModel']) = new Map(m.topologyModel);
        (this.controlPointModel as GeometryDatabase['controlPointModel']) = new Map(m.controlPointModel);
        (this.hidden as GeometryDatabase['hidden']) = new Set(m.hidden);
        (this.invisible as GeometryDatabase['invisible']) = new Set(m.invisible);
        (this.automatics as GeometryDatabase['automatics']) = new Set(m.automatics);
    }

    async serialize(): Promise<Buffer> {
        return this.saveToMemento().serialize();
    }

    async deserialize(data: Buffer): Promise<void> {
        const everything = await c3d.Writer.ReadItems_async(data);
        return this.load(everything);
    }

    async load(model: c3d.Model, preserveNames = true): Promise<void> {
        const promises: Promise<any>[] = [];
        const loadItems = (stack: c3d.Item[]) => {
            while (stack.length > 0) {
                const item = stack.pop()!;
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
        await Promise.all(promises);
    }

    copy(solid: c3d.Solid, edges: c3d.CurveEdge[]) {
        const shell = solid.GetShell()!;
        const indices = shell.FindFacesIndexByEdges(edges);
        const history = new c3d.ShellHistory();
        const copyShell = shell.Copy(c3d.CopyMode.KeepHistory, history)!;
        copyShell.SetOwnChangedThrough(c3d.ChangedType.Unchanged);
        const copySolid = new c3d.Solid(copyShell, solid, undefined);
        const copyEdges = copyShell.FindEdgesByFacesIndex(indices, null, null, [], []);
        return { solid: copySolid, edges: copyEdges }
    }
    
    validate() {
    }

    debug() {
        console.group("GeometryDatabase");
        console.info("Version: ", this.version);
        const { geometryModel, topologyModel, controlPointModel } = this;
        console.group("geometryModel");
        console.table([...geometryModel].map(([name]) => { return { name } }));
        console.groupEnd();
        console.group("topologyModel");
        console.table([...topologyModel].map(([name]) => { return { name } }));
        console.groupEnd();
        console.group("controlPointModel");
        console.table([...controlPointModel].map(([name, stack]) => { return { name } }));
        console.groupEnd();
        console.groupEnd();
    }
}