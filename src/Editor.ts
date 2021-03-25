import * as THREE from "three";
import signals from "signals";
import { Command } from './commands/Command';
import c3d from '../build/Release/c3d.node';

function hash(str: string) {
    for (var i = 0, h = 9; i < str.length;)
        h = Math.imul(h ^ str.charCodeAt(i++), 9 ** 9);
    return h ^ h >>> 9
};

const materials = new Map<number, THREE.Material>();
materials.set(hash("line"), new THREE.LineBasicMaterial({ color: 0xff0000 }));
materials.set(hash("lineBlue"), new THREE.LineBasicMaterial({ color: 0x0000ff }));
materials.set(hash("lineGreen"), new THREE.LineBasicMaterial({ color: 0x00ff00 }));
materials.set(hash("point"), new THREE.PointsMaterial({ color: 0x888888 }));
materials.set(hash("mesh"), new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
materials.set(hash("meshKhaki"), new THREE.MeshLambertMaterial({ color: 0x000c0a6 }));

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
    scene: THREE.Scene;
    selected?: THREE.Object3D;
    signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        rendererAdded: new signals.Signal()
    }

    geometryModel = new c3d.Model();

    constructor() {
        this.scene = new THREE.Scene();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);
    }

    execute(command: Command) {
        command.execute();
    }

    addObject(object: THREE.Object3D | c3d.SpaceItem) {
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

    object2mesh(o: c3d.SpaceItem) {
        const stepData = new c3d.StepData(0x01, 0.005);
        const note = new c3d.FormNote(false, true, true, false, false);
        const item = o.CreateMesh(stepData, note, null);
        if (item.IsA() != 508) throw "Unexpected return type";
        const mesh = item.Cast(508);
        const st = o.GetStyle() as number;
        const material = materials.get(st);
        const group = new THREE.Group();
        switch (mesh.GetMeshType()) {
            case 201:
                const edges = mesh.GetEdges();
                for (const edge of edges) {
                    const geometry = new THREE.BufferGeometry();
                    geometry.setAttribute('position', new THREE.Float32BufferAttribute(edge, 3));
                    const line = new THREE.Line(geometry, material ?? materials.get(hash("line")));
                    group.add(line);
                }
                return group;
            case 101:
                const apexes = mesh.GetApexes();
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(apexes, 3));
                const points = new THREE.Points(geometry, material ?? materials.get(hash("point")));
                return points;
            default:
                const grids = mesh.GetBuffers();
                const meshMaterial = material ?? materials.get(hash("mesh"));
                for (const grid of grids) {
                    let gridMaterial = grid.style == 0 ? meshMaterial : materials.get(grid.style);
                    gridMaterial = gridMaterial.clone();
                    gridMaterial.side = mesh.IsClosed() ? THREE.FrontSide : THREE.DoubleSide;
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