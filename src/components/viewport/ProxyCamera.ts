import * as THREE from "three";

export const near = 0.01;
export const far = 10000;
export const frustumSize = 20;

type Mode = 'orthographic' | 'perspective';

export class ProxyCamera extends THREE.Camera {
    private readonly orthographic = makeOrthographicCamera();
    private readonly perspective = makePerspectiveCamera();

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

        perspective.near = near;
        perspective.far = far;
        orthographic.near = near;
        orthographic.far = far;
        this.updateProjectionMatrix();
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
}

export function makeOrthographicCamera() {
    const orthographicCamera = new THREE.OrthographicCamera(-frustumSize / 2, frustumSize / 2, frustumSize / 2, -frustumSize / 2, 0, far);
    orthographicCamera.zoom = 0.6;
    return orthographicCamera;
}

export function makePerspectiveCamera() {
    const persp = new THREE.PerspectiveCamera(frustumSize, 1, near, far);
    return persp;
}
