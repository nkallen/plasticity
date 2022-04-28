import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import * as c3d from '../kernel/kernel';
import { RaycasterParams } from "../editor/snaps/SnapPicker";
import { point2point, vec2vec } from '../util/Conversion';
import { RaycastableTopologyItem } from "./Intersectable";
import { ControlPointGroup, Curve3D, CurveEdge, CurveGroup, CurveSegment, Face, FaceGroup, PlaneInstance, Region, Solid, SpaceInstance } from './VisualModel';
import { ImageEmpty } from "../editor/Empties";

declare module './VisualModel' {
    interface TopologyItem {
        raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void;
    }

    interface Face {
        computeBoundingBox(): void;
        boundingBox?: THREE.Box3;
        getBoundingBox(): THREE.Box3;
    }

    interface CurveEdge {
        computeBoundingBox(): void;
        boundingBox?: THREE.Box3;
        boundingSphere?: THREE.Sphere;
        getBoundingBox(): THREE.Box3;
    }

    interface CurveSegment {
        computeBoundingBox(): void;
        boundingBox?: THREE.Box3;
        boundingSphere?: THREE.Sphere;
        raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]): void;
    }
}

Solids: {
    Solid.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        _v1.setFromMatrixPosition(this.matrixWorld);
        const distance = raycaster.ray.origin.distanceTo(_v1);
        const level = this.lod.getObjectForDistance(distance)!;
        const edges = level.children[0];
        const faces = level.children[1];

        raycaster.intersectObject(faces, false, intersects);
        raycaster.intersectObject(edges, false, intersects);
    }

    FaceGroup.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const { matrixWorld, geometry } = this.mesh;

        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
        _sphere.copy(geometry.boundingSphere!);
        _sphere.applyMatrix4(matrixWorld);
        if (!raycaster.ray.intersectsSphere(_sphere)) return;

        _inverseMatrix.copy(matrixWorld).invert();
        _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);
        if (geometry.boundingBox !== null) {
            if (!_ray.intersectsBox(geometry.boundingBox)) return;
        }

        const objects = [...this];
        for (const object of objects) {
            if (object.layers.test(raycaster.layers)) {
                raycastableTopologyItem.topologyItem = object;
                raycastableTopologyItem.raycast(raycaster, intersects);
            }
        }

        intersects.sort(ascSort);
    }

    RaycastableTopologyItem.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        this['_topologyItem'].raycast(raycaster, intersects);
    }

    Face.prototype.computeBoundingBox = function () {
        const { grid } = this;
        const cube = grid.GetCube();
        const { pmin, pmax } = cube;
        this.boundingBox = new THREE.Box3(point2point(pmin, 1), point2point(pmax, 1));
    }

    Face.prototype.getBoundingBox = function () {
        if (this.boundingBox === undefined) this.computeBoundingBox();
        const bbox = this.boundingBox!.clone();

        const parent = this.parent as FaceGroup;
        const { matrixWorld } = parent.mesh;
        bbox.applyMatrix4(matrixWorld);
        return bbox;
    }

    Face.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const { grid } = this;
        const parent = this.parent as FaceGroup;
        const { matrixWorld } = parent.mesh;
        if (this.boundingBox === undefined) this.computeBoundingBox();
        const boundingBox = this.boundingBox!;

        _inverseMatrix.copy(matrixWorld).invert();
        _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);
        if (!_ray.intersectsBox(boundingBox)) return;

        const line = new c3d.FloatAxis3D(point2point(_ray.origin, 1), vec2vec(_ray.direction, 1));

        const { intersected, crossPoint } = c3d.MeshGrid.LineGridIntersect(grid, line);
        if (intersected) {
            const point = point2point(crossPoint, 1).applyMatrix4(matrixWorld);
            intersects.push({
                object: raycastableTopologyItem,
                distance: raycaster.ray.origin.distanceTo(point),
                point,
                // @ts-expect-error
                topologyItem: this,
            });
        }
    }

    CurveGroup.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const { line } = this;
        const camera = raycaster.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
        const { geometry, matrixWorld } = line;
        const { resolution } = line.material as LineMaterial;

        let { linewidth } = line.material;
        const raycasterParams = raycaster.params as RaycasterParams;
        const threshold = ('Line2' in raycasterParams !== undefined) ? raycasterParams.Line2.threshold || 0 : 0;
        linewidth += threshold;

        BoundingSphere: {
            if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
            _sphere.copy(geometry.boundingSphere!);
            _sphere.applyMatrix4(matrixWorld);

            const distanceToSphere = Math.max(camera.near, _sphere.distanceToPoint(raycaster.ray.origin)); // increase the sphere bounds by the worst case line screen space width
            _clipToWorldVector.set(0, 0, - distanceToSphere, 1.0).applyMatrix4(camera.projectionMatrix);
            _clipToWorldVector.multiplyScalar(1.0 / _clipToWorldVector.w);
            _clipToWorldVector.applyMatrix4(camera.projectionMatrixInverse); // increase the sphere bounds by the worst case line screen space width
            const sphereMargin = getWorldSpaceHalfWidth(camera, distanceToSphere, linewidth, resolution);
            _sphere.radius += sphereMargin;
            if (!raycaster.ray.intersectsSphere(_sphere)) return;
        }

        BoundingBox: {
            if (geometry.boundingBox === null) geometry.computeBoundingBox();
            _box.copy(geometry.boundingBox!);
            _box.applyMatrix4(matrixWorld);

            const distanceToBox = Math.max(camera.near, _box.distanceToPoint(raycaster.ray.origin)); // increase the box bounds by the worst case line screen space width
            const boxMargin = getWorldSpaceHalfWidth(camera, distanceToBox, linewidth, resolution) + 10;
            _box.max.x += boxMargin;
            _box.max.y += boxMargin;
            _box.max.z += boxMargin;
            _box.min.x -= boxMargin;
            _box.min.y -= boxMargin;
            _box.min.z -= boxMargin;
            if (!raycaster.ray.intersectsBox(_box)) return;
        }

        raycaster.intersectObjects([...this], false, intersects);
    }

    CurveEdge.prototype.computeBoundingBox = function () {
        const parent = this.parent as CurveGroup<CurveEdge>;
        const line = parent.line;

        BuildSlice: {
            const allPoints = line.geometry.attributes.instanceStart.array as Float32Array;
            const group = this.group;
            const slice = new Float32Array(allPoints.buffer, group.start * 4, group.count);
            _instanceBuffer.array = slice;
            _instanceBuffer.count = slice.length / _instanceBuffer.stride;
        }

        BuildBoundingBoxOfSlice: {
            this.boundingBox = new THREE.Box3();
            _lineSegmentsGeometry.computeBoundingBox();
            _lineSegmentsGeometry.computeBoundingSphere();
            this.boundingBox = _lineSegmentsGeometry.boundingBox!.clone();
            this.boundingSphere = _lineSegmentsGeometry.boundingSphere!.clone();
        }
    }

    CurveEdge.prototype.getBoundingBox = function() {
        if (this.boundingBox === undefined) this.computeBoundingBox();
        const bbox = this.boundingBox!.clone();

        const parent = this.parent as CurveGroup<CurveEdge>;
        const line = parent.line;
        bbox.applyMatrix4(line.matrixWorld);
        return bbox;
    }

    CurveEdge.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const parent = this.parent as CurveGroup<CurveEdge>;
        const line = parent.line;

        BuildSlice: {
            const allPoints = line.geometry.attributes.instanceStart.array as Float32Array;
            const group = this.group;
            const slice = new Float32Array(allPoints.buffer, group.start * 4, group.count);
            _instanceBuffer.array = slice;
            _instanceBuffer.count = slice.length / _instanceBuffer.stride;
        }

        BuildBoundingBoxOfSlice: {
            if (this.boundingBox === undefined) {
                this.boundingBox = new THREE.Box3();
                _lineSegmentsGeometry.computeBoundingBox();
                _lineSegmentsGeometry.computeBoundingSphere();
                this.boundingBox = _lineSegmentsGeometry.boundingBox!.clone();
                this.boundingSphere = _lineSegmentsGeometry.boundingSphere!.clone();
            } else {
                _lineSegmentsGeometry.boundingBox!.copy(this.boundingBox!);
                _lineSegmentsGeometry.boundingSphere!.copy(this.boundingSphere!);
            }
        }

        // NOTE: the precomputed bounding box is used by _lineSegments.raycast
        _lineSegments.material = line.material;
        _lineSegments.geometry = _lineSegmentsGeometry;
        _lineSegments.matrixWorld.copy(line.matrixWorld);
        const is: THREE.Intersection[] = [];
        raycaster.intersectObject(_lineSegments, false, is);

        for (const i of is) {
            intersects.push({
                ...i,
                object: raycastableTopologyItem,
                // @ts-expect-error
                topologyItem: this
            })
        }
    }
}

Curves: {
    SpaceInstance.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        raycaster.intersectObject(this.underlying, false, intersects);
    }

    Curve3D.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const is: THREE.Intersection[] = [];
        raycaster.intersectObject(this.segments.line, false, is);
        for (const i of is) {
            intersects.push({ ...i, object: this, });
        }
        raycaster.intersectObject(this.points, false, intersects);
    }

    CurveSegment.prototype.computeBoundingBox = function () {
        const parent = this.parent as CurveGroup<CurveEdge>;
        const line = parent.line;

        BuildSlice: {
            const allPoints = line.geometry.attributes.instanceStart.array as Float32Array;
            const group = this.group;
            const slice = new Float32Array(allPoints.buffer, group.start * 4, group.count);
            _instanceBuffer.array = slice;
            _instanceBuffer.count = slice.length / _instanceBuffer.stride;
        }

        BuildBoundingBoxOfSlice: {
            this.boundingBox = new THREE.Box3();
            _lineSegmentsGeometry.computeBoundingBox();
            _lineSegmentsGeometry.computeBoundingSphere();
            this.boundingBox = _lineSegmentsGeometry.boundingBox!.clone();
            this.boundingSphere = _lineSegmentsGeometry.boundingSphere!.clone();
        }
    }

    ControlPointGroup.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const is: THREE.Intersection[] = [];
        raycaster.intersectObject(this.points, false, is);
        for (const i of is) {
            const object = this.get(i.index!);
            intersects.push({ ...i, object });
        }
    }
}

Regions: {
    PlaneInstance.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        raycaster.intersectObject(this.underlying, false, intersects);
    }

    Region.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const is: THREE.Intersection[] = [];
        raycaster.intersectObject(this.mesh, false, is);
        for (const i of is) {
            intersects.push({ ...i, object: this, })
        }
    }
}

Empties: {
    ImageEmpty.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const child: THREE.Intersection[] = [];
        raycaster.intersectObject(this.plane, false, child);
        if (child.length > 0) {
            const intersection = child[0];
            intersection.object = this;
            intersects.push(intersection);
        }
    }
}

export class BetterRaycastingPointsMaterial extends THREE.PointsMaterial {
    readonly resolution = new THREE.Vector2
}

export class BetterRaycastingPoints extends THREE.Points {
    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const { geometry, matrixWorld } = this;
        const camera = raycaster.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
        const threshold = raycaster.params.Points?.threshold ?? 0;

        const size = 1; // px
        const ssMaxWidth = size + threshold;
        const material = this.material as BetterRaycastingPointsMaterial;
        const resolution = material.resolution;

        BoundingSphere: {
            if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
            _sphere.copy(geometry.boundingSphere!).applyMatrix4(matrixWorld);
            const distanceToSphere = Math.max(camera.near, _sphere.distanceToPoint(_ray.origin)); // increase the sphere bounds by the worst case line screen space width
            const sphereMargin = getWorldSpaceHalfWidth(camera, distanceToSphere + _sphere.radius, ssMaxWidth, resolution);

            _sphere.radius += sphereMargin;
            if (!raycaster.ray.intersectsSphere(_sphere)) return;
        }

        BoundingBox: {
            if (geometry.boundingBox === null) geometry.computeBoundingBox();
            _box.copy(geometry.boundingBox!).applyMatrix4(matrixWorld);
            const distanceToBox = Math.max(camera.near, _box.distanceToPoint(_ray.origin));
            const boxMargin = getWorldSpaceHalfWidth(camera, distanceToBox, ssMaxWidth, resolution);
            _box.max.x += boxMargin;
            _box.max.y += boxMargin;
            _box.max.z += boxMargin;
            _box.min.x -= boxMargin;
            _box.min.y -= boxMargin;
            _box.min.z -= boxMargin;
            if (!raycaster.ray.intersectsBox(_box)) return;
        }

        _inverseMatrix.copy(matrixWorld).invert();
        _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

        const { attributes: { position: positionAttribute }, drawRange } = geometry;

        const start = Math.max(0, drawRange.start);
        const end = Math.min(positionAttribute.count, (drawRange.start + drawRange.count));

        for (let i = start, l = end; i < l; i++) {
            _position.fromBufferAttribute(positionAttribute, i);
            const dist = Math.max(camera.near, _position.distanceTo(_ray.origin));
            const half = getWorldSpaceHalfWidth(camera, dist, ssMaxWidth, resolution);
            const halfSq = half * half;
            const rayPointDistanceSq = _ray.distanceSqToPoint(_position);

            if (rayPointDistanceSq < halfSq) {
                const intersectPoint = new THREE.Vector3();
                _ray.closestPointToPoint(_position, intersectPoint);
                intersectPoint.applyMatrix4(matrixWorld);
                const distance = raycaster.ray.origin.distanceTo(intersectPoint);
                if (distance < raycaster.near || distance > raycaster.far) return;
                intersects.push({
                    distance: distance,
                    distanceToRay: Math.sqrt(rayPointDistanceSq),
                    point: intersectPoint,
                    index: i,
                    object: this,
                });
            }
        }
    }
}

function getWorldSpaceHalfWidth(camera: THREE.Camera, distance: number, lineWidth: number, resolution: THREE.Vector2) {
    // transform into clip space, adjust the x and y values by the pixel width offset, then
    // transform back into world space to get world offset. Note clip space is [-1, 1] so full
    // width does not need to be halved.
    _clipToWorldVector.set(0, 0, - distance, 1.0).applyMatrix4(camera.projectionMatrix);
    _clipToWorldVector.multiplyScalar(1.0 / _clipToWorldVector.w);
    _clipToWorldVector.x = lineWidth / resolution.width;
    _clipToWorldVector.y = lineWidth / resolution.height;
    _clipToWorldVector.applyMatrix4(camera.projectionMatrixInverse);
    _clipToWorldVector.multiplyScalar(1.0 / _clipToWorldVector.w);
    return Math.abs(Math.max(_clipToWorldVector.x, _clipToWorldVector.y));
}

const _inverseMatrix = new THREE.Matrix4();
const _ray = new THREE.Ray();
const _sphere = new THREE.Sphere();
const _v1 = new THREE.Vector3();
const _clipToWorldVector = new THREE.Vector4();
const _box = new THREE.Box3();
const _lineSegments = new LineSegments2();
const _instanceBuffer = new THREE.InstancedInterleavedBuffer([], 6, 1); // xyz, xyz
const _lineSegmentsGeometry = new LineSegmentsGeometry();
_lineSegmentsGeometry.setAttribute('instanceStart', new THREE.InterleavedBufferAttribute(_instanceBuffer, 3, 0)); // xyz
_lineSegmentsGeometry.setAttribute('instanceEnd', new THREE.InterleavedBufferAttribute(_instanceBuffer, 3, 3)); // xyz
const _position = new THREE.Vector3();
const raycastableTopologyItem = new RaycastableTopologyItem();

function ascSort(a: { distance: number }, b: { distance: number }) {
    return a.distance - b.distance;
}

export { };
