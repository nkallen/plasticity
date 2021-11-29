import * as THREE from "three";

export type IntersectionType = 'not-intersected' | 'intersected' | 'contained';

export interface Boxcastable {
    boxcast(type: IntersectionType, boxcaster: Boxcaster, selects: Boxcastable[]): void;
    intersectsBounds(boxcaster: Boxcaster): IntersectionType;
    containsGeometry(boxcaster: Boxcaster): boolean;
    intersectsGeometry(boxcaster: Boxcaster): boolean;
    layers: THREE.Layers;
}

type CameraLike = THREE.Camera & {
    updateProjectionMatrix: () => void;
    isPerspectiveCamera?: boolean;
    isOrthographicCamera?: boolean;
};

export class Boxcaster {
    readonly startPoint = new THREE.Vector3();
    readonly endPoint = new THREE.Vector3();
    readonly frustum = new THREE.Frustum();
    private mode: 'contains' | 'intersects' = 'contains';
    private readonly deep = Number.MAX_VALUE;

    constructor(private readonly camera: CameraLike, public layers = new THREE.Layers()) {
    }

    selectObject<T extends Boxcastable>(object: T, selected: T[] = []): T[] {
        if (!this.layers.test(object.layers)) return selected;

        const bounds = object.intersectsBounds(this);
        if (bounds == 'not-intersected') selected;

        object.boxcast(bounds, this, selected);
        return selected;
    }

    selectObjects<T extends Boxcastable>(objects: T[], selected: T[] = []): T[] {
        for (const object of objects) {
            this.selectObject(object, selected);
        }
        return selected;
    }

    selectGeometry(object: Boxcastable, selected: Boxcastable[]) {
        if (this.mode == 'contains' && object.containsGeometry(this)) {
            selected.push(object);
        } else if (this.mode == 'intersects' && object.intersectsGeometry(this)) {
            selected.push(object);
        }
    }

    updateFrustum() {
        const { startPoint, endPoint } = this;

        this.mode = endPoint.x < startPoint.x ? 'intersects' : 'contains';

        // Avoid invalid frustum
        if (startPoint.x === endPoint.x) endPoint.x += Number.EPSILON;
        if (startPoint.y === endPoint.y) endPoint.y += Number.EPSILON;

        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld();

        const planes = this.frustum.planes;
        if (this.camera.isPerspectiveCamera) {
            _tmpPoint.copy(startPoint);
            _tmpPoint.x = Math.min(startPoint.x, endPoint.x);
            _tmpPoint.y = Math.max(startPoint.y, endPoint.y);
            endPoint.x = Math.max(startPoint.x, endPoint.x);
            endPoint.y = Math.min(startPoint.y, endPoint.y);

            _vecNear.setFromMatrixPosition(this.camera.matrixWorld);
            _vecTopLeft.copy(_tmpPoint);
            _vecTopRight.set(endPoint.x, _tmpPoint.y, 0);
            _vecDownRight.copy(endPoint);
            _vecDownLeft.set(_tmpPoint.x, endPoint.y, 0);

            _vecTopLeft.unproject(this.camera);
            _vecTopRight.unproject(this.camera);
            _vecDownRight.unproject(this.camera);
            _vecDownLeft.unproject(this.camera);

            _vectemp1.copy(_vecTopLeft).sub(_vecNear);
            _vectemp2.copy(_vecTopRight).sub(_vecNear);
            _vectemp3.copy(_vecDownRight).sub(_vecNear);
            _vectemp1.normalize();
            _vectemp2.normalize();
            _vectemp3.normalize();

            _vectemp1.multiplyScalar(this.deep);
            _vectemp2.multiplyScalar(this.deep);
            _vectemp3.multiplyScalar(this.deep);
            _vectemp1.add(_vecNear);
            _vectemp2.add(_vecNear);
            _vectemp3.add(_vecNear);


            planes[0].setFromCoplanarPoints(_vecNear, _vecTopLeft, _vecTopRight);
            planes[1].setFromCoplanarPoints(_vecNear, _vecTopRight, _vecDownRight);
            planes[2].setFromCoplanarPoints(_vecDownRight, _vecDownLeft, _vecNear);
            planes[3].setFromCoplanarPoints(_vecDownLeft, _vecTopLeft, _vecNear);
            planes[4].setFromCoplanarPoints(_vecTopRight, _vecDownRight, _vecDownLeft);
            planes[5].setFromCoplanarPoints(_vectemp3, _vectemp2, _vectemp1);
            planes[5].normal.multiplyScalar(- 1);
        } else if (this.camera.isOrthographicCamera) {
            const left = Math.min(startPoint.x, endPoint.x);
            const top = Math.max(startPoint.y, endPoint.y);
            const right = Math.max(startPoint.x, endPoint.x);
            const down = Math.min(startPoint.y, endPoint.y);

            _vecTopLeft.set(left, top, - 1);
            _vecTopRight.set(right, top, - 1);
            _vecDownRight.set(right, down, - 1);
            _vecDownLeft.set(left, down, - 1);

            _vecFarTopLeft.set(left, top, 1);
            _vecFarTopRight.set(right, top, 1);
            _vecFarDownRight.set(right, down, 1);
            _vecFarDownLeft.set(left, down, 1);

            _vecTopLeft.unproject(this.camera);
            _vecTopRight.unproject(this.camera);
            _vecDownRight.unproject(this.camera);
            _vecDownLeft.unproject(this.camera);

            _vecFarTopLeft.unproject(this.camera);
            _vecFarTopRight.unproject(this.camera);
            _vecFarDownRight.unproject(this.camera);
            _vecFarDownLeft.unproject(this.camera);

            planes[0].setFromCoplanarPoints(_vecTopLeft, _vecFarTopLeft, _vecFarTopRight);
            planes[1].setFromCoplanarPoints(_vecTopRight, _vecFarTopRight, _vecFarDownRight);
            planes[2].setFromCoplanarPoints(_vecFarDownRight, _vecFarDownLeft, _vecDownLeft);
            planes[3].setFromCoplanarPoints(_vecFarDownLeft, _vecFarTopLeft, _vecTopLeft);
            planes[4].setFromCoplanarPoints(_vecTopRight, _vecDownRight, _vecDownLeft);
            planes[5].setFromCoplanarPoints(_vecFarDownRight, _vecFarTopRight, _vecFarTopLeft);
            planes[5].normal.multiplyScalar(- 1);
        }
    }

    searchChildInFrustum(frustum: THREE.Frustum, object: { isInFrustrum(): boolean }) {
        // if (object.geometry.boundingSphere === null) object.geometry.computeBoundingSphere();
        // _center.copy(object.geometry.boundingSphere.center);
        // _center.applyMatrix4(object.matrixWorld);
        // if (frustum.containsPoint(_center)) {
        //     this.collection.push(object);
        // }
    }
}


const _center = new THREE.Vector3();
const _tmpPoint = new THREE.Vector3();

const _vecNear = new THREE.Vector3();
const _vecTopLeft = new THREE.Vector3();
const _vecTopRight = new THREE.Vector3();
const _vecDownRight = new THREE.Vector3();
const _vecDownLeft = new THREE.Vector3();

const _vecFarTopLeft = new THREE.Vector3();
const _vecFarTopRight = new THREE.Vector3();
const _vecFarDownRight = new THREE.Vector3();
const _vecFarDownLeft = new THREE.Vector3();

const _vectemp1 = new THREE.Vector3();
const _vectemp2 = new THREE.Vector3();
const _vectemp3 = new THREE.Vector3();

const _cross = new THREE.Vector3();
