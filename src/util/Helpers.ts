import * as THREE from 'three';
import { EditorSignals } from '../editor/Editor';
import * as visual from "../editor/VisualModel";

// Helpers are little visualization tools like gizmos that should
// be rendered as a separate pass from the main scene so they appear
// in front of everything

// The axes helper is also here, though it's rendered as a normal pass,
// so that it appears behind things.

export interface Helper extends THREE.Object3D {
    update(camera: THREE.Camera): void;
}

export class Helpers {
    readonly scene = new THREE.Scene();
    readonly axes: THREE.AxesHelper;

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(({ camera }) => this.update(camera));

        const axes = new THREE.AxesHelper(10000);
        axes.renderOrder = 0;
        axes.layers.set(visual.Layers.Overlay);
        const material = axes.material as THREE.Material;
        material.depthFunc = THREE.AlwaysDepth;
        this.axes = axes;
    }

    add(...object: Helper[]) {
        this.scene.add(...object);
    }

    remove(...object: Helper[]) {
        this.scene.remove(...object);
    }

    update(camera: THREE.Camera) {
        for (const child of this.scene.children) {
            const helper = child as Helper;
            helper.update(camera);
        }
    }
}
