import * as THREE from "three";
import { CameraMemento, MementoOriginator } from "../../editor/History";

export const near = 0.001;
export const far = 10000;
export const frustumSize = 6;
export const fov = 50;
export const aspect = 1;

type Mode = 'orthographic' | 'perspective';

export class ProxyCamera extends THREE.Camera implements MementoOriginator<CameraMemento> {
     readonly orthographic = makeOrthographicCamera();
     readonly perspective = makePerspectiveCamera();

    static isPerspective(camera: THREE.Camera): camera is THREE.PerspectiveCamera {
        if (camera instanceof THREE.PerspectiveCamera) return true;
        if (camera instanceof ProxyCamera && camera.mode === 'perspective') return true;
        return false;
    }

    static isOrthographic(camera: THREE.Camera): camera is THREE.OrthographicCamera {
        return !this.isPerspective(camera);
    }

    get isPerspectiveCamera() { return this.mode === 'perspective' }
    get isOrthographicCamera() { return this.mode === 'orthographic' }

    constructor(private mode: Mode = 'orthographic') {
        super();
        this.updateProjectionMatrix();
    }

    offsetWidth: number = 100;
    offsetHeight: number = 100;

    setSize(offsetWidth = this.offsetWidth, offsetHeight = this.offsetHeight) {
        const { orthographic, perspective } = this;
        this.offsetWidth = offsetWidth;
        this.offsetHeight = offsetHeight;

        const aspect = offsetWidth / offsetHeight;
        perspective.aspect = aspect;
        orthographic.left = frustumSize * aspect / -2;
        orthographic.right = frustumSize * aspect / 2;
        orthographic.top = frustumSize / 2;
        orthographic.bottom = - frustumSize / 2;

        perspective.near = near;
        perspective.far = far;
        orthographic.near = near;
        orthographic.far = far;

        // Set orthographic zoom to something that corresponds to the effective field of view of the perspective camera
        const zoom = (orthographic.top - orthographic.bottom) * Math.atan(Math.PI * perspective.getEffectiveFOV() / 360) / 3.1;
        orthographic.zoom = zoom;

        this.updateProjectionMatrix();
    }

    setViewOffset(fullWidth: number, fullHeight: number, x: number, y: number, width: number, height: number) {
        this.perspective.setViewOffset(fullWidth, fullHeight, x, y, width, height);
    }

    clearViewOffset() {
        this.perspective.clearViewOffset();
        this.orthographic.clearViewOffset();
    }

    updateProjectionMatrix() {
        this.orthographic.updateProjectionMatrix();
        this.perspective.updateProjectionMatrix();
        if (this.mode === 'orthographic') {
            this.projectionMatrix = this.orthographic.projectionMatrix;
            this.projectionMatrixInverse = this.orthographic.projectionMatrixInverse;
        } else {
            this.projectionMatrix = this.perspective.projectionMatrix;
            this.projectionMatrixInverse = this.perspective.projectionMatrixInverse;
        }
    }

    toggle() {
        this.mode = this.mode === 'perspective' ? 'orthographic' : 'perspective';

        this.updateProjectionMatrix();
    }

    get zoom() { return this.orthographic.zoom; }
    set zoom(zoom: number) {
        this.orthographic.zoom = zoom;
    }

    get left() { return this.orthographic.left }
    get right() { return this.orthographic.right }
    get top() { return this.orthographic.top }
    get bottom() { return this.orthographic.bottom }

    get fov() { return this.perspective.fov }
    get near() { return this.perspective.near }
    get far() { return this.perspective.far }
    get aspect() { return this.perspective.aspect }

    getEffectiveFOV() { return this.perspective.getEffectiveFOV() }

    saveToMemento(): CameraMemento {
        return new CameraMemento(
            this.mode,
            this.position.clone(),
            this.quaternion.clone(),
            this.zoom,
            this.offsetWidth, this.offsetHeight);
    }

    restoreFromMemento(m: CameraMemento): void {
        this.mode = m.mode;
        this.position.copy(m.position);
        this.quaternion.copy(m.quaternion);
        this.zoom = m.zoom;
        this.updateMatrixWorld();
        this.updateProjectionMatrix();
    }

    serialize(): Promise<Buffer> { throw new Error("Method not implemented.") }
    deserialize(data: Buffer): Promise<void> { throw new Error("Method not implemented.") }
    validate(): void { throw new Error("Method not implemented.") }
    debug(): void { throw new Error("Method not implemented.") }
}

export function makeOrthographicCamera() {
    const orthographicCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, near, far);
    return orthographicCamera;
}

export function makePerspectiveCamera() {
    const perspective = new THREE.PerspectiveCamera(fov, aspect, near, far);
    return perspective;
}
