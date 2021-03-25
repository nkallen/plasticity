import * as THREE from "three";
import signals from "signals";
import { Command } from './commands/Command';
import c3d from '../build/Release/c3d.node';
console.log(new c3d.Model());

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

    constructor() {
        this.scene = new THREE.Scene();
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);
    }

    execute(command: Command) {
        command.execute();
    }

    addObject(object: THREE.Object3D) {
        this.scene.add(object);
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