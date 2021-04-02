import * as THREE from "three";
import signals from "signals";
import Command from './commands/Command';
import c3d from '../build/Release/c3d.node';
import MaterialDatabase from "./MaterialDatabase";
import { SelectionManager } from './SelectionManager';
import { Face, CurveEdge, Item, SpaceInstance, SpaceItem, TopologyItem, CurveSegment, Curve3DBuilder, SolidBuilder, FaceGroupBuilder, CurveEdgeGroupBuilder } from './VisualModel';
import { SpriteDatabase } from "./SpriteDatabase";
import { PlaneSnap, SnapManager } from './SnapManager';
import { Viewport } from "./Viewport";

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<SpaceItem>;
    objectSelected: signals.Signal<SpaceItem>;
    objectDeselected: signals.Signal<SpaceItem>;
    objectHovered: signals.Signal<SpaceItem>
    sceneGraphChanged: signals.Signal;
    commandUpdated: signals.Signal;
    pointPickerChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    rendererAdded: signals.Signal<THREE.Renderer>;
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
    readonly drawModel = new Set<SpaceItem>();
    readonly materialDatabase = new MaterialDatabase();
    readonly scene = new THREE.Scene();
    readonly selectionManager = new SelectionManager(this);
    readonly snapManager = new SnapManager(this);
    readonly spriteDatabase = new SpriteDatabase();

    constructor() {
        // FIXME dispose of these:
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);

        const axes = new THREE.AxesHelper(10000);
        axes.renderOrder = 0;
        const material = axes.material as THREE.Material;
        material.depthFunc = THREE.AlwaysDepth;
        this.scene.add(axes);
        this.scene.background = new THREE.Color(0x424242);
    }

    execute(command: Command) {
        command.execute();
    }

    // FIXME rename addItem?(item, visual)
    addObject(object: c3d.Item, mesh?: SpaceItem) {
        mesh = mesh ?? this.object2mesh(object);
        const o = this.geometryModel.AddItem(object);
        mesh.userData.simpleName = o.GetItemName();

        this.scene.add(mesh);
        this.drawModel.add(mesh);
        this.snapManager.add(mesh);

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
        this.snapManager.delete(object);
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

    object2mesh(obj: c3d.Item, sag: number = 0.005, wireframe: boolean = true): SpaceItem {
        const stepData = new c3d.StepData(c3d.StepType.SpaceStep, sag);
        const note = new c3d.FormNote(wireframe, true, true, false, false);
        const item = obj.CreateMesh(stepData, note, null);
        if (item.IsA() != c3d.SpaceType.Mesh) throw "Unexpected return type";
        const mesh = item.Cast<c3d.Mesh>(c3d.SpaceType.Mesh);
        switch (mesh.GetMeshType()) {
            case c3d.SpaceType.Curve3D: {
                const curve3D = new Curve3DBuilder();
                const edges = mesh.GetEdges();
                let material = this.materialDatabase.line(item);
                for (const edge of edges) {
                    const line = new CurveSegment(edge, material);
                    curve3D.addCurveSegment(line);
                }
                return new SpaceInstance(curve3D.build());
            }
            // case c3d.SpaceType.Point3D: {
            //     const apexes = mesh.GetApexes();
            //     const geometry = new THREE.BufferGeometry();
            //     geometry.setAttribute('position', new THREE.Float32BufferAttribute(apexes, 3));
            //     const points = new THREE.Points(geometry, this.materialDatabase.point(obj));
            //     return points;
            // }
            default: {
                const solid = new SolidBuilder();
                const edges = new CurveEdgeGroupBuilder();
                const lineMaterial = this.materialDatabase.line();
                const polygons = mesh.GetEdges(true);
                for (const edge of polygons) {
                    const line = new CurveEdge(edge, lineMaterial);
                    edges.addEdge(line);
                }
                solid.addEdges(edges.build());

                const faces = new FaceGroupBuilder();
                const grids = mesh.GetBuffers();
                for (const grid of grids) {
                    const material = this.materialDatabase.mesh(grid, mesh.IsClosed());
                    const face = new Face(grid, material);
                    faces.addFace(face);
                }
                solid.addFaces(faces.build());
                return solid.build();
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
