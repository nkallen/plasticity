import * as THREE from 'three';
import { ProxyCamera } from "../components/viewport/ProxyCamera";
import { EditorSignals } from '../editor/EditorSignals';
import { Theme } from '../startup/LoadTheme';
import * as visual from "../visual_model/VisualModel";

// Helpers are little visualization tools like gizmos that should
// be rendered as a separate pass from the main scene so they appear
// in front of everything

// The axes helper is also here, though it's rendered as a normal pass,
// so that it appears behind things.

export abstract class Helper extends THREE.Object3D {
    readonly eye = new THREE.Vector3();
    readonly worldPosition = new THREE.Vector3();
    readonly worldQuaternion = new THREE.Quaternion();
    readonly worldQuaternionInv = new THREE.Quaternion();

    get shouldRescaleOnZoom() { return this.parent?.type === 'Scene' }

    update(camera: THREE.Camera) {
        this.scaleIndependentOfZoom(camera);

        const { worldPosition, worldQuaternion } = this;
        this.getWorldPosition(worldPosition);
        this.getWorldQuaternion(worldQuaternion);
        this.worldQuaternionInv.copy(worldQuaternion).invert();

        this.eye.copy(camera.position).sub(worldPosition).normalize();
    }

    // Since gizmos tend to scale as the camera moves in and out, set the
    // you can make it bigger or smaller with this:
    readonly relativeScale = new THREE.Vector3(1, 1, 1);

    // Scale the gizmo so it has a uniform size regardless of camera position/zoom
    protected scaleIndependentOfZoom(camera: THREE.Camera) {
        this.scale.copy(this.relativeScale);
        if (!this.shouldRescaleOnZoom) return;

        Helper.scaleIndependentOfZoom(this, camera, this.worldPosition);
    }

    static scaleIndependentOfZoom(object: THREE.Object3D, camera: THREE.Camera, worldPosition: THREE.Vector3) {
        let factor;
        if (ProxyCamera.isOrthographic(camera)) {
            factor = (camera.top - camera.bottom) / camera.zoom;
        } else if (ProxyCamera.isPerspective(camera)) {
            factor = worldPosition.distanceTo(camera.position) * Math.min(1.9 * Math.tan(Math.PI * camera.fov / 360), 7);
        } else throw new Error("invalid camera type");
        factor *= 1 / 11;
        object.scale.multiplyScalar(factor);
        object.updateMatrixWorld();
        return factor;
    }
}

export class SimpleHelper extends Helper {
    constructor(underlying: THREE.Object3D) {
        super();
        this.add(underlying);
    }
}

export class Helpers {
    readonly scene = new THREE.Scene();
    readonly axes: THREE.AxesHelper;

    constructor(signals: EditorSignals, styles: Theme) {
        const axes = new THREE.AxesHelper(10_000);
        axes.layers.set(visual.Layers.Overlay);
        this.axes = axes;
        axes.renderOrder = -1;
        axes.position.set(0, 0, 0.005);
        const material = axes.material as THREE.Material;
        material.fog = false;
        axes.setColors(
            new THREE.Color(styles.colors.red[600]).convertSRGBToLinear(),
            new THREE.Color(styles.colors.green[600]).convertSRGBToLinear(),
            new THREE.Color(styles.colors.blue[600]).convertSRGBToLinear());
    }

    add(...objects: THREE.Object3D[]) {
        this.scene.add(...objects);
    }

    remove(...objects: THREE.Object3D[]) {
        this.scene.remove(...objects);
    }

    clear() {
        this.scene.clear();
    }
}
