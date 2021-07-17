import * as THREE from 'three';
import { EditorSignals } from '../editor/Editor';

// Helpers are little visualization tools like gizmos that should
// be rendered as a separate pass from the main scene.

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
