import * as THREE from "three";
import signals from "signals";
import { Command } from './commands/Command';
import c3d from '../build/Release/c3d.node';
import MaterialDatabase from "./MaterialDatabase";

interface EditorSignals {
    objectAdded: signals.Signal<THREE.Object3D>;
    sceneGraphChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    rendererAdded: signals.Signal<THREE.Renderer>;
}

interface V {
    renderer: THREE.Renderer;
    camera: THREE.Camera;
}

export class Editor {
    viewports: V[] = [];

    signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        rendererAdded: new signals.Signal()
    }

    geometryModel = new c3d.Model();
    materialDatabase = new MaterialDatabase();
    scene: THREE.Scene;
    selected?: THREE.Object3D;

    constructor() {
        this.scene = new THREE.Scene();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);
    }

    execute(command: Command) {
        command.execute();
    }

    addObject(object: THREE.Object3D | c3d.Item) {
        console.log(object.constructor);
        if (object instanceof THREE.Object3D) {
            this.scene.add(object);
            console.log("a");
        } else if (object instanceof c3d.SpaceItem) {
            const mesh = this.object2mesh(object);
            const o = this.geometryModel.AddItem(object);
            mesh.userData.simpleName = o.GetItemName();
            // mesh.traverse(sub => hitTestModel[sub.userData.simpleName] = sub);
            this.scene.add(mesh);
            console.log("b");
        }
    }

    object2mesh(obj: c3d.Item) {
        const stepData = new c3d.StepData(0x01, 0.005);
        const note = new c3d.FormNote(false, true, true, false, false);
        const item = obj.CreateMesh(stepData, note, null);
        if (item.IsA() != 508) throw "Unexpected return type";
        const mesh = item.Cast<c3d.Mesh>(508);
        const group = new THREE.Group();
        switch (mesh.GetMeshType()) {
            case 201:
                const edges = mesh.GetEdges();
                for (const edge of edges) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
                    const line = new THREE.Line(geometry, this.materialDatabase.line(obj));
                    group.add(line);
                }
                return group;
            case 101:
                const apexes = mesh.GetApexes();
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(apexes, 3));
                const points = new THREE.Points(geometry, this.materialDatabase.point(obj));
                return points;
            default:
                const grids = mesh.GetBuffers();
                for (const grid of grids) {
                    const gridMaterial = this.materialDatabase.mesh(grid, mesh.IsClosed());
                    const geometry = new THREE.BufferGeometry();
                    geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
                    geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
                    geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
                    const gridMesh = new THREE.Mesh(geometry, gridMaterial);
                    gridMesh.userData.name = grid.name;
                    gridMesh.userData.simpleName = grid.simpleName;
                    group.add(gridMesh);
                }
                return group;
        }
    }

    select(object: THREE.Object3D) {
        this.selected = object;
        this.signals.objectAdded.dispatch(object);
        this.signals.sceneGraphChanged.dispatch(object);
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.signals.windowLoaded.dispatch();
    }

}