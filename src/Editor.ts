import * as THREE from "three";
import signals from "signals";
import Command from './commands/Command';
import c3d from '../build/Release/c3d.node';
import MaterialDatabase from "./MaterialDatabase";
import { SelectionManager } from './SelectionManager';
import { Face, CurveEdge, Item, Edge, Curve3D, EdgeGroup, FaceGroup, VisualModel, TopologyItem } from './VisualModel';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { SpriteDatabase } from "./SpriteDatabase";
import { Snap, OriginSnap, AxisSnap } from './SnapManager';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<VisualModel>;
    objectSelected: signals.Signal<VisualModel>;
    objectDeselected: signals.Signal<VisualModel>;
    objectHovered: signals.Signal<VisualModel>
    sceneGraphChanged: signals.Signal;
    commandUpdated: signals.Signal;
    pointPickerChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    rendererAdded: signals.Signal<THREE.Renderer>;
}

interface Viewport {
    renderer: THREE.Renderer;
    camera: THREE.Camera;
    constructionPlane: THREE.Mesh;
    enableControls(): void;
    disableControls(): void;
    overlay: THREE.Scene;
}

export interface TemporaryObject {
    cancel(): void;
    commit(): void;
}

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        objectSelected: new signals.Signal(),
        objectDeselected: new signals.Signal(),
        objectHovered: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        commandUpdated: new signals.Signal(),
        pointPickerChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        rendererAdded: new signals.Signal()
    }

    readonly geometryModel = new c3d.Model();
    readonly drawModel = new Set<VisualModel>();
    readonly materialDatabase = new MaterialDatabase();
    readonly scene = new THREE.Scene();
    readonly selectionManager = new SelectionManager(this);
    readonly snaps = new Set<Snap>();
    readonly spriteDatabase = new SpriteDatabase();

    constructor() {
        // FIXME dispose of these:
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);

        const axes = new THREE.AxesHelper(10000);
        this.scene.add(axes);
        this.scene.background = new THREE.Color(0x424242);

        this.snaps.add(new OriginSnap().configure());
        this.snaps.add(new AxisSnap(new THREE.Vector3(1, 0, 0)).configure());
        this.snaps.add(new AxisSnap(new THREE.Vector3(0, 1, 0)).configure());
        this.snaps.add(new AxisSnap(new THREE.Vector3(0, 0, 1)).configure());
    }

    execute(command: Command) {
        command.execute();
    }

    addObject(object: c3d.Item, mesh?: VisualModel) {
        mesh = mesh ?? this.object2mesh(object);
        const o = this.geometryModel.AddItem(object);
        mesh.userData.simpleName = o.GetItemName();

        this.scene.add(mesh);
        this.drawModel.add(mesh);

        this.signals.objectAdded.dispatch(mesh);
        this.signals.sceneGraphChanged.dispatch();
    }

    addTemporaryObject(object: c3d.Item): TemporaryObject {
        const mesh = this.object2mesh(object, 0.05, false);
        this.scene.add(mesh);
        return {
            cancel: () => {
                mesh.dispose();
                this.scene.remove(mesh);
            },
            commit: () => {
                this.addObject(object, mesh);
            }
        }
    }

    removeItem(object: Item) {
        this.scene.remove(object);
        this.drawModel.delete(object);
        this.geometryModel.DetachItem(this.lookupItem(object));
    }

    lookupItem(object: Item): c3d.Item {
        const { item } = this.geometryModel.GetItemByName(object.userData.simpleName);
        return item;
    }

    lookupTopologyItem(object: TopologyItem): c3d.TopologyItem {
        const parent = object.parentItem;
        const parentModel = this.lookupItem(parent);
        if (parentModel.IsA() != c3d.SpaceType.Solid) throw "Unexpected return type";
        const solid = parentModel.Cast<c3d.Solid>(c3d.SpaceType.Solid);

        return solid.FindEdgeByName(object.userData.name);
    }

    object2mesh(obj: c3d.Item, sag: number = 0.005, wireframe: boolean = true): VisualModel {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const note = new c3d.FormNote(wireframe, true, true, false, false);
        const item = obj.CreateMesh(stepData, note, null);
        if (item.IsA() != c3d.SpaceType.Mesh) throw "Unexpected return type";
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        switch (mesh.GetMeshType()) {
            case c3d.SpaceType.Curve3D: {
                const curve3D = Curve3D.builder();
                const edges = mesh.GetEdges();
                for (const edge of edges) {
                    const geometry = new LineGeometry();
                    geometry.setPositions(edge.position);
                    const line = new Edge(edge.name, edge.simpleName, geometry, this.materialDatabase.line());
                    curve3D.addEdge(line);
                }
                return curve3D.build();
            }
            // case c3d.SpaceType.Point3D: {
            //     const apexes = mesh.GetApexes();
            //     const geometry = new THREE.BufferGeometry();
            //     geometry.setAttribute('position', new THREE.Float32BufferAttribute(apexes, 3));
            //     const points = new THREE.Points(geometry, this.materialDatabase.point(obj));
            //     return points;
            // }
            default: {
                const item = Item.builder();
                const edges = EdgeGroup.builder();
                const lineMaterial = this.materialDatabase.line();
                const polygons = mesh.GetEdges(true);
                for (const edge of polygons) {
                    const geometry = new LineGeometry();
                    geometry.setPositions(edge.position);
                    const line = new CurveEdge(edge.name, edge.simpleName, geometry, lineMaterial);
                    edges.addEdge(line);
                }
                item.addEdges(edges.build());

                const faces = FaceGroup.builder();
                const grids = mesh.GetBuffers();
                for (const grid of grids) {
                    const gridMaterial = this.materialDatabase.mesh(grid, mesh.IsClosed());
                    const geometry = new THREE.BufferGeometry();
                    geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
                    geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
                    geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
                    const face = new Face(grid.name, grid.simpleName, geometry, gridMaterial);
                    faces.addFace(face);
                }
                item.addFaces(faces.build());
                return item.build();
            }
        }
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.signals.windowLoaded.dispatch();
    }
}
