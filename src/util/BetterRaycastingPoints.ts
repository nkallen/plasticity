import * as THREE from "three";

/**
 * The existing THREE Points class uses world-space for raycasting points. That means the target is the
 * same size regardless of zoom level. But points are infinitely small, and we want their target to simply
 * be their screen space resolution, which is constant regardless of zoom level. But the world-space
 * equivalent varies by zoom level... Thus
 */

const _sphere = new THREE.Sphere();
const _position = new THREE.Vector3();

export class BetterRaycastingPoints extends THREE.Points {
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const geometry = this.geometry;
        const matrixWorld = this.matrixWorld;
        // @ts-expect-error
        const threshold = raycaster.params.Points.threshold;
        const drawRange = geometry.drawRange;
    
        // Checking boundingSphere distance to ray
    
        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

        _sphere.copy(geometry.boundingSphere!);
        _sphere.applyMatrix4(matrixWorld);
        _sphere.radius = Math.max(0.1, _sphere.radius);
    
        if (raycaster.ray.intersectsSphere(_sphere) === false) return;
    
        const attributes = geometry.attributes;
        const positionAttribute = attributes.position;

        const start = Math.max(0, drawRange.start);
        const end = Math.min(positionAttribute.count, (drawRange.start + drawRange.count));
    
        const camera = raycaster.camera;
        const ray = raycaster.ray;
    
        const material = this.material as THREE.PointsMaterial;
        const resolution = material.userData.resolution as THREE.Vector2;
    
        const ssMaxWidth = (material.size + threshold) / resolution.width;
    
        for (let i = start, l = end; i < l; i++) {
            _position.fromBufferAttribute(positionAttribute, i);
    
            // @ts-expect-error
            const dist = Math.max(camera.near, _position.distanceTo(ray.origin));
            const clipToWorld = new THREE.Vector4(1, 0, -dist, 1).applyMatrix4(camera.projectionMatrix);
            clipToWorld.divideScalar(clipToWorld.w);
            const sphereMargin = Math.abs(ssMaxWidth / clipToWorld.x) + threshold;
    
            testPoint(ray, _position, i, sphereMargin * sphereMargin, matrixWorld, raycaster, intersects, this);
        }
    }
}


function testPoint(ray: THREE.Ray, point: THREE.Vector3, index: number, localThresholdSq: number, matrixWorld: THREE.Matrix4, raycaster: THREE.Raycaster, intersects: THREE.Intersection[], object: THREE.Object3D) {
    const rayPointDistanceSq = ray.distanceSqToPoint(point);

    if (rayPointDistanceSq < localThresholdSq) {
        const intersectPoint = new THREE.Vector3();

        ray.closestPointToPoint(point, intersectPoint);
        intersectPoint.applyMatrix4(matrixWorld);

        const distance = raycaster.ray.origin.distanceTo(intersectPoint);

        if (distance < raycaster.near || distance > raycaster.far) return;

        intersects.push({
            distance: distance,
            distanceToRay: Math.sqrt(rayPointDistanceSq),
            point: intersectPoint,
            index: index,
            face: null,
            object: object

        });
    }
}