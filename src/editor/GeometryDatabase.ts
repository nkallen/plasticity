import * as THREE from 'three';
import { PointsMaterial } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../../build/Release/c3d.node';
import { SequentialExecutor } from '../util/SequentialExecutor';
import { assertUnreachable, GConstructor } from '../util/Util';
import { EditorSignals } from './EditorSignals';
import { GeometryMemento } from './History';
import MaterialDatabase from './MaterialDatabase';
import * as visual from './VisualModel';

const mesh_precision_distance: [number, number][] = [[0.1, 300], [0.001, 5]];
const other_precision_distance: [number, number][] = [[0.0005, 1]];

export interface TemporaryObject {
    get underlying(): visual.Item;
    cancel(): void;
    show(): void;
}

export type TopologyData = { model: c3d.TopologyItem, views: Set<visual.Face | visual.Edge> };
export type ControlPointData = { index: number, views: Set<visual.ControlPoint> };

type Builder = visual.SpaceInstanceBuilder<visual.Curve3D | visual.Surface> | visual.PlaneInstanceBuilder<visual.Region> | visual.SolidBuilder;

export interface MaterialOverride {
    region?: THREE.Material;
    line?: LineMaterial;
    lineDashed?: LineMaterial;
    controlPoint?: PointsMaterial;
    mesh?: THREE.Material;
    surface?: THREE.Material;
}

export type Agent = 'user' | 'automatic';

export class GeometryDatabase {
    readonly temporaryObjects = new THREE.Scene();
    readonly phantomObjects = new THREE.Scene();

    private readonly geometryModel = new Map<c3d.SimpleName, { view: visual.Item, model: c3d.Item }>();
    private readonly topologyModel = new Map<string, TopologyData>();
    private readonly controlPointModel = new Map<string, ControlPointData>();
    private readonly hidden = new Set<c3d.SimpleName>();
    readonly queue = new SequentialExecutor();

    constructor(
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals) { }

    private counter = 0;

    async addItem(model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    async addItem(model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async addItem(model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    async addItem(model: c3d.Item, agent?: Agent): Promise<visual.Item>;
    async addItem(model: c3d.Item, agent: Agent = 'user'): Promise<visual.Item> {
        const current = this.counter++;
        return this.queue.enqueue(async () => {
            const view = await this.meshes(model, current, this.precisionAndDistanceFor(model)); // FIXME it would be nice to move this out of the queue but tests fail

            this.geometryModel.set(current, { view, model });
            view.traverse(t => {
                if (t instanceof visual.Face || t instanceof visual.CurveEdge) {
                    if (!(model instanceof c3d.Solid)) throw new Error("invalid precondition");
                    this.addTopologyItem(model, t);
                } else if (t instanceof visual.ControlPointGroup) {
                    if (!(model instanceof c3d.SpaceInstance)) throw new Error("invalid precondition");
                    for (const child of t) this.addControlPoint(model, child);
                }
            });

            this.signals.sceneGraphChanged.dispatch();
            this.signals.objectAdded.dispatch([view, agent]);
            return view;
        });
    }

    private precisionAndDistanceFor(item: c3d.Item): [number, number][] {
        if (item.IsA() === c3d.SpaceType.Solid) {
            return mesh_precision_distance;
        } else {
            return other_precision_distance;
        }
    }

    async addPhantom(object: c3d.Item, materials?: MaterialOverride): Promise<TemporaryObject> {
        return this.addTemporaryItem(object, materials, this.phantomObjects);
    }

    async addTemporaryItem(object: c3d.Item, materials?: MaterialOverride, into = this.temporaryObjects): Promise<TemporaryObject> {
        const mesh = await this.meshes(object, -1, [[0.003, 1]], materials);
        mesh.visible = false;
        into.add(mesh);
        return {
            underlying: mesh,
            show() { mesh.visible = true },
            cancel() {
                mesh.dispose();
                into.remove(mesh);
            }
        }
    }

    clearTemporaryObjects() {
        this.temporaryObjects.clear();
        this.phantomObjects.clear();
    }

    removeItem(view: visual.Item, agent: Agent = 'user') {
        return this.queue.enqueue(async () => {
            const simpleName = view.simpleName;
            this.geometryModel.delete(simpleName);
            this.removeTopologyItems(view);
            this.removeControlPoints(view);
            this.hidden.delete(simpleName);

            this.signals.objectRemoved.dispatch([view, agent]);
            this.signals.sceneGraphChanged.dispatch();
        });
    }

    lookupItemById(id: c3d.SimpleName): { view: visual.Item, model: c3d.Item } {
        const result = this.geometryModel.get(id);
        if (result === undefined) throw new Error(`invalid precondition: object ${id} missing from geometry model`);
        return result;
    }

    // FIXME rethink error messages and consider using Family rather than isA for curve3d?
    lookup(object: visual.Solid): c3d.Solid;
    lookup(object: visual.SpaceInstance<visual.Curve3D>): c3d.SpaceInstance;
    lookup(object: visual.PlaneInstance<visual.Region>): c3d.PlaneInstance;
    lookup(object: visual.Item): c3d.Item;
    lookup(object: visual.Item): c3d.Item {
        return this.lookupItemById(object.simpleName).model;
    }

    lookupTopologyItemById(id: string): TopologyData {
        const result = this.topologyModel.get(id);
        if (result === undefined) throw new Error(`invalid precondition: object ${id} missing from topology model`);
        return result;
    }

    lookupTopologyItem(object: visual.Face): c3d.Face;
    lookupTopologyItem(object: visual.CurveEdge): c3d.CurveEdge;
    lookupTopologyItem(object: visual.Edge | visual.Face): c3d.TopologyItem {
        const parent = object.parentItem;
        const { model: parentModel } = this.lookupItemById(parent.simpleName);
        if (!(parentModel instanceof c3d.Solid)) throw new Error("Invalid precondition");
        const solid = parentModel;

        if (object instanceof visual.Edge) {
            const result = solid.GetEdge(object.index);
            if (!result) throw new Error("cannot find edge");
            return result;
        } else if (object instanceof visual.Face) {
            const result = solid.GetFace(object.index);
            if (!result) throw new Error("cannot find face");
            return result;
        }
        assertUnreachable(object);
    }


    find<T extends visual.PlaneInstance<visual.Region>>(klass: GConstructor<T>): { view: T, model: c3d.PlaneInstance }[];
    find<T extends visual.SpaceInstance<visual.Curve3D>>(klass: GConstructor<T>): { view: T, model: c3d.SpaceInstance }[];
    find<T extends visual.Solid>(klass: GConstructor<T>): { view: T, model: c3d.Solid }[];
    find(): { view: visual.Item, model: c3d.Solid }[];
    find<T extends visual.Item>(klass?: GConstructor<T>): { view: T, model: c3d.Item }[] {
        const result: { view: visual.Item, model: c3d.Item }[] = [];
        if (klass === undefined) {
            for (const { view, model } of this.geometryModel.values()) {
                result.push({ view, model });
            }
        } else {
            for (const { view, model } of this.geometryModel.values()) {
                if (view instanceof klass) result.push({ view, model });
            }
        }
        return result as { view: T, model: c3d.Item }[];
    }

    get visibleObjects(): Array<visual.Item> {
        const { geometryModel, hidden } = this;
        const difference = [];
        for (const { view } of geometryModel.values()) {
            if (!hidden.has(view.simpleName)) difference.push(view);
        }
        return difference;
    }

    _scene = new THREE.Scene();
    get scene(): THREE.Scene {
        return this._scene;
    }

    rebuildScene() {
        this._scene.clear();
        for (const v of this.visibleObjects) this._scene.add(v);
        this._scene.add(this.temporaryObjects);
        return this._scene;
    }

    private async meshes(obj: c3d.Item, id: c3d.SimpleName, precision_distance: [number, number][], materials?: MaterialOverride): Promise<visual.Item> {
        let builder;
        switch (obj.IsA()) {
            case c3d.SpaceType.SpaceInstance:
                builder = new visual.SpaceInstanceBuilder<visual.Curve3D | visual.Surface>();
                break;
            case c3d.SpaceType.PlaneInstance:
                builder = new visual.PlaneInstanceBuilder<visual.Region>();
                break;
            case c3d.SpaceType.Solid:
                builder = new visual.SolidBuilder();
                break;
            default:
                throw new Error("type not yet supported");
        }

        const promises = [];
        for (const [precision, distance] of precision_distance) {
            promises.push(this.object2mesh(builder, obj, id, precision, distance, materials));
        }
        await Promise.all(promises);

        const result = builder.build();
        result.userData.simpleName = id;
        return result;
    }

    private async object2mesh(builder: Builder, obj: c3d.Item, id: c3d.SimpleName, sag: number, distance?: number, materials?: MaterialOverride): Promise<void> {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const note = new c3d.FormNote(true, true, true, false, false);
        const item = await obj.CreateMesh_async(stepData, note);
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);

        switch (obj.IsA()) {
            case c3d.SpaceType.SpaceInstance: {
                const instance = obj as c3d.SpaceInstance;
                const underlying = instance.GetSpaceItem();
                if (underlying === null) throw new Error("invalid precondition");
                switch (underlying.Family()) {
                    case c3d.SpaceType.Curve3D:
                        const curveBuilder = builder as visual.SpaceInstanceBuilder<visual.Curve3D>;
                        const edges = mesh.GetEdges();
                        if (edges.length === 0) throw new Error(`invalid precondition: no edges`);

                        const lineMaterial = materials?.line ?? this.materials.line(instance);
                        const pointMaterial = materials?.controlPoint ?? this.materials.controlPoint();

                        const pointGroup = visual.ControlPointGroup.build(underlying, id, pointMaterial);

                        let line;
                        if (edges.length > 1) line = visual.Curve3D.build(edges[0], id, pointGroup, lineMaterial, this.materials.lineDashed());
                        else line = visual.Curve3D.build(edges[0], id, pointGroup, lineMaterial, materials?.lineDashed ?? this.materials.lineDashed());

                        curveBuilder.addLOD(line, distance);
                        break;
                    case c3d.SpaceType.Surface:
                        const surfaceBuilder = builder as visual.SpaceInstanceBuilder<visual.Surface>;
                        const grids = mesh.GetBuffers();
                        if (grids.length != 1) throw new Error("Invalid precondition");
                        const grid = grids[0];
                        const material = materials?.surface ?? this.materials.surface(instance);
                        const surface = visual.Surface.build(grid, material);
                        surfaceBuilder.addLOD(surface, distance);
                        break;
                    default: throw new Error("invalid precondition")
                }
                break;
            }
            case c3d.SpaceType.PlaneInstance: {
                const instance = builder as visual.PlaneInstanceBuilder<visual.Region>;
                const grids = mesh.GetBuffers();
                if (grids.length != 1) throw new Error("Invalid precondition");
                const grid = grids[0];
                const material = materials?.region ?? this.materials.region();
                const region = visual.Region.build(grid, material);
                instance.addLOD(region, distance);
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
                const solid = builder as visual.SolidBuilder;
                const edges = new visual.CurveEdgeGroupBuilder();
                const lineMaterial = materials?.line ?? this.materials.line();
                const polygons = mesh.GetEdges(true);
                for (const edge of polygons) {
                    const line = visual.CurveEdge.build(edge, id, lineMaterial, this.materials.lineDashed());
                    edges.addEdge(line);
                }

                const faces = new visual.FaceGroupBuilder();
                const grids = mesh.GetBuffers();
                for (const grid of grids) {
                    const material = materials?.mesh ?? this.materials.mesh(grid, mesh.IsClosed());
                    const face = visual.Face.build(grid, id, material);
                    faces.addFace(face);
                }
                solid.addLOD(edges.build(), faces.build(), distance);
                break;
            }
            default: throw new Error("type not yet supported");
        }
    }

    private addTopologyItem<T extends visual.Face | visual.Edge>(parent: c3d.Solid, t: T) {
        let topologyData = this.topologyModel.get(t.simpleName);
        let views;
        if (topologyData === undefined) {
            let model;
            if (t instanceof visual.Face) {
                model = parent.GetFace(t.index);
            } else if (t instanceof visual.CurveEdge) {
                model = parent.GetEdge(t.index);
            };
            if (model == null) throw new Error("invalid precondition");
            views = new Set<visual.Face | visual.Edge>();
            topologyData = { model, views }
            this.topologyModel.set(t.simpleName, topologyData);
        } else {
            views = topologyData.views;
        }
        views.add(t);
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

    private addControlPoint(parent: c3d.SpaceInstance, t: visual.ControlPoint) {
        const spaceItem = parent.GetSpaceItem();
        if (spaceItem === null) throw new Error("invalid precondition");
        if (spaceItem.Family() !== c3d.SpaceType.Curve3D) throw new Error("invalid precondition");
        let data = this.controlPointModel.get(t.simpleName);
        let views;
        if (data === undefined) {
            views = new Set<visual.ControlPoint>();
            data = { index: t.index, views: views }
            this.controlPointModel.set(t.simpleName, data);
        } else {
            views = data.views;
        }
        views.add(t);
    }

    private removeControlPoints(parent: visual.Item) {
        parent.traverse(o => {
            if (o instanceof visual.ControlPointGroup) {
                for (const p of o) this.controlPointModel.delete(p.simpleName);
            }
        })
    }

    hide(item: visual.Item) {
        this.hidden.add(item.simpleName);
    }

    unhide(item: visual.Item) {
        this.hidden.delete(item.simpleName);
    }

    unhideAll() {
        this.hidden.clear();
    }

    saveToMemento(registry: Map<any, any>): GeometryMemento {
        return new GeometryMemento(
            new Map(this.geometryModel),
            new Map(this.topologyModel),
            new Map(this.controlPointModel),
            new Set(this.hidden));
    }

    restoreFromMemento(m: GeometryMemento) {
        (this.geometryModel as GeometryDatabase['geometryModel']) = m.geometryModel;
        (this.topologyModel as GeometryDatabase['topologyModel']) = m.topologyModel;
        (this.controlPointModel as GeometryDatabase['controlPointModel']) = m.controlPointModel;
        (this.hidden as GeometryDatabase['hidden']) = m.hidden;
    }
}