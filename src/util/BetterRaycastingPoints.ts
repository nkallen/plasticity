import * as THREE from "three";
import { SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';

/**
 * The existing THREE Points class uses world-space for raycasting points. That means the target is the
 * same size regardless of zoom level. But points are infinitely small, and we want their target to simply
 * be their screen space resolution, which is constant regardless of zoom level. But the world-space
 * equivalent varies by zoom level... Thus
 */

const _sphere = new THREE.Sphere();
const _position = new THREE.Vector3();

export class BetterRaycastingPoint extends THREE.Mesh {
    constructor(readonly index: number, readonly parent: BetterRaycastingPoints) {
        super();
    }
}

export class BetterRaycastingPoints extends THREE.Points {
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const geometry = this.geometry;
        const matrixWorld = this.matrixWorld;
        // @ts-expect-error
        const threshold = raycaster.params.Points.threshold;
        const drawRange = geometry.drawRange;

        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

        _sphere.copy(geometry.boundingSphere!);
        _sphere.applyMatrix4(matrixWorld);
        _sphere.radius = Math.max(0.1, _sphere.radius + 0.1);

        if (raycaster.ray.intersectsSphere(_sphere) === false) return;

        const attributes = geometry.attributes;
        const positionAttribute = attributes.position;

        const camera = raycaster.camera;
        const ray = raycaster.ray;

        const material = this.material as THREE.PointsMaterial;
        const resolution = material.userData.resolution as THREE.Vector2;
        const ssMaxWidth = (material.size + threshold) / resolution.width;

        const start = Math.max(0, drawRange.start);
        const end = Math.min(positionAttribute.count, (drawRange.start + drawRange.count));
        for (let i = start, l = end; i < l; i++) {
            _position.fromBufferAttribute(positionAttribute, i);

            // @ts-expect-error
            const dist = Math.max(camera.near, _position.distanceTo(ray.origin));
            const clipToWorld = new THREE.Vector4(1, 0, -dist, 1).applyMatrix4(camera.projectionMatrix);
            clipToWorld.divideScalar(clipToWorld.w);
            const sphereMargin = Math.abs(ssMaxWidth / clipToWorld.x);

            testPoint(ray, _position, i, sphereMargin * sphereMargin, matrixWorld, raycaster, intersects, this);
        }
    }
}


function testPoint(ray: THREE.Ray, point: THREE.Vector3, index: number, localThresholdSq: number, matrixWorld: THREE.Matrix4, raycaster: THREE.Raycaster, intersects: THREE.Intersection[], object: BetterRaycastingPoints) {
    const rayPointDistanceSq = ray.distanceSqToPoint(point);

    if (rayPointDistanceSq < localThresholdSq) {
        const intersectPoint = new THREE.Vector3();

        ray.closestPointToPoint(point, intersectPoint);
        intersectPoint.applyMatrix4(matrixWorld);

        const distance = raycaster.ray.origin.distanceTo(intersectPoint);

        if (distance < raycaster.near || distance > raycaster.far) return;

        const mesh = new BetterRaycastingPoint(index, object);
        intersects.push({
            distance: distance,
            distanceToRay: Math.sqrt(rayPointDistanceSq),
            point: intersectPoint,
            face: null,
            object: mesh
        });
    }
}

export class BetterSelectionBox extends SelectionBox {
    searchChildInFrustum(frustrum: THREE.Frustum, object: THREE.Object3D) {
        if (object instanceof BetterRaycastingPoints) {
            const geometry = object.geometry
            const { drawRange, attributes: { position: positionAttribute } } = geometry;
            const { matrixWorld } = object;

            const start = Math.max(0, drawRange.start);
            const end = Math.min(positionAttribute.count, (drawRange.start + drawRange.count));
            for (let i = start; i < end; i++) {
                _position.fromBufferAttribute(positionAttribute, i);
                _position.applyMatrix4(matrixWorld);
                if (frustrum.containsPoint(_position)) {
                    const mesh = new BetterRaycastingPoint(i, object);
                    this.collection.push(mesh);
                }
            }
        } else {
            super.searchChildInFrustum(frustrum, object);
        }
    };
}