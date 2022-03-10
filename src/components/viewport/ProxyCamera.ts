import * as THREE from "three";
import { CameraMemento, MementoOriginator } from "../../editor/History";

const near = 10e-3;
const far = 10e4;
const frustumSize = 6;
const fov = 50;
const aspect = 1;

export type CameraMode = 'orthographic' | 'perspective';

const ZZZ = new THREE.Vector3(0, 0, 1).multiplyScalar(100); // FIXME: this should be a function of the GeometryDatabase LOD (mesh_precision_distance)

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

    constructor(private mode: CameraMode = 'orthographic') {
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
        this.orthographic.setViewOffset(fullWidth, fullHeight, x, y, width, height);
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

    setMode(mode: CameraMode) {
        this.mode = mode;
        this.updateProjectionMatrix();
    }

    setOrtho(): CameraMode {
        const old = this.mode;
        this.setMode('orthographic');
        return old;
    }

    toggle() {
        const mode = this.mode === 'perspective' ? 'orthographic' : 'perspective';
        this.setMode(mode);
    }

    get zoom() { return this.orthographic.zoom; }
    set zoom(zoom: number) {
        this.orthographic.zoom = zoom;
    }

    get left() { return this.orthographic.left }
    get right() { return this.orthographic.right }
    get top() { return this.orthographic.top }
    get bottom() { return this.orthographic.bottom }

    get fov() {
        return this.isPerspectiveCamera ? this.perspective.fov : 0;
    }

    set fov(fov: number) {
        this.setMode('perspective');
        this.perspective.fov = fov;
        this.updateProjectionMatrix();
    }

    get near() { return this.perspective.near }
    get far() { return this.perspective.far }
    get aspect() { return this.perspective.aspect }

    getEffectiveFOV() { return this.perspective.getEffectiveFOV() }

    saveToMemento(): CameraMemento {
        return new CameraMemento(
            this.mode,
            this.position.clone(),
            this.quaternion.clone(),
            this.zoom);
    }

    restoreFromMemento(m: CameraMemento): void {
        this.mode = m.mode;
        this.position.copy(m.position);
        this.quaternion.copy(m.quaternion);
        this.zoom = m.zoom;
        this.updateMatrixWorld();
        this.updateProjectionMatrix();
    }

    readonly spherical = new THREE.Spherical();

    validate(): void { throw new Error("Method not implemented.") }
    debug(): void { throw new Error("Method not implemented.") }

    readonly target = new THREE.Vector3();
    private readonly _z = new THREE.Vector3();
    updateMatrixWorld(force?: boolean) {
        const { _z, quaternion, target, matrixWorld, matrixWorldInverse } = this;
        super.updateMatrixWorld(force);
        if (this.isOrthographicCamera) {
            const pos = _z.copy(ZZZ).applyQuaternion(quaternion).add(target);
            matrixWorld.setPosition(pos);
        }
        matrixWorldInverse.copy(matrixWorld).invert();
    }
}

export function makeOrthographicCamera() {
    const orthographicCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, near, far);
    return orthographicCamera;
}

export function makePerspectiveCamera() {
    const perspective = new THREE.PerspectiveCamera(fov, aspect, near, far);
    return perspective;
}
