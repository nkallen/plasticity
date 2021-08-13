import { EditorSignals } from '../editor/EditorSignals';
import * as THREE from 'three';
import * as visual from "../editor/VisualModel";

// Helpers are little visualization tools like gizmos that should
// be rendered as a separate pass from the main scene so they appear
// in front of everything

// The axes helper is also here, though it's rendered as a normal pass,
// so that it appears behind things.

export abstract class Helper extends THREE.Object3D {
    readonly eye = new THREE.Vector3();
    readonly worldPosition = new THREE.Vector3();
    readonly worldQuaternion = new THREE.Quaternion();

    get shouldRescaleOnZoom() { return this.parent?.type === 'Scene' }

    update(camera: THREE.Camera) {
        this.scaleIndependentOfZoom(camera);

        const { worldPosition, worldQuaternion } = this;
        this.getWorldPosition(worldPosition);
        this.getWorldQuaternion(worldQuaternion);

        this.eye.copy(camera.position).sub(worldPosition).normalize();
    }

    // Since gizmos tend to scale as the camera moves in and out, set the
    // you can make it bigger or smaller with this:
    readonly relativeScale = new THREE.Vector3(1, 1, 1);

    // Scale the gizmo so it has a uniform size regardless of camera position/zoom
    scaleIndependentOfZoom(camera: THREE.Camera) {
        this.scale.copy(this.relativeScale);
        if (!this.shouldRescaleOnZoom) return;

        let factor;
        if (camera instanceof THREE.OrthographicCamera) {
            factor = (camera.top - camera.bottom) / camera.zoom;
        } else if (camera instanceof THREE.PerspectiveCamera) {
            factor = this.position.distanceTo(camera.position) * Math.min(1.9 * Math.tan(Math.PI * camera.fov / 360) / camera.zoom, 7);
        } else {
            throw new Error("Invalid camera type");
        }

        this.scale.multiplyScalar(factor * 1 / 11);
        this.updateMatrixWorld();
    }
}

export class Helpers {
    readonly scene = new THREE.Scene();
    readonly axes: THREE.AxesHelper;

    constructor(signals: EditorSignals) {
        signals.renderPrepared.add(({ camera }) => this.update(camera));

        const axes = new THREE.AxesHelper(10_000);
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
