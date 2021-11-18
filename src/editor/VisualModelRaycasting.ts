import { intersectionTypeAnnotation } from "@babel/types";
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import c3d from '../../build/Release/c3d.node';
import { point2point, vec2vec } from '../util/Conversion';
import { CurveEdge, CurveGroup, Face, FaceGroup, Solid } from './VisualModel';

declare module './VisualModel' {
    interface Face {
        boundingBox?: THREE.Box3;
    }
    interface CurveEdge {
        boundingBox?: THREE.Box3;
        boundingSphere?: THREE.Sphere;
    }
}

Solid.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    _v1.setFromMatrixPosition(this.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(_v1);
    const level = this.lod.getObjectForDistance(distance)!;
    const edges = level.children[0];
    const faces = level.children[1];

    faces.raycast(raycaster, intersects);
    edges.raycast(raycaster, intersects);
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

    for (const face of this) {
        face.raycast(raycaster, intersects);
    }
}

Face.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    return;
    const { grid } = this;
    const parent = this.parent as FaceGroup;
    const { matrixWorld } = parent.mesh;
    // if (this.boundingBox === undefined) {
    //     const cube = grid.GetCube();
    //     const { pmin, pmax } = cube;
    //     this.boundingBox = new THREE.THREE.Box3(point2point(pmin), point2point(pmax));
    // }
    // const boundingBox = this.boundingBox;

    // _inverseMatrix.copy(matrixWorld).invert();
    // _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);
    // if (!_ray.intersectsBox(boundingBox)) return;

    // const axis = new c3d.Axis3D(point2point(_ray.origin), vec2vec(_ray.direction, 1));
    // const line = new c3d.FloatAxis3D(axis);

    // const { intersected, crossPoint, tRes } = c3d.MeshGrid.LineGridIntersect(grid, line);
    // if (intersected) {
    //     const point = point2point(crossPoint);
    //     intersects.push({
    //         object: this,
    //         distance: _ray.origin.distanceTo(point),
    //         point,
    //     });
    // }
}

CurveGroup.prototype.raycast = function (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
    const { line } = this;
    const camera = raycaster.camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
    const { geometry, matrixWorld } = line;
    const { resolution, linewidth } = line.material as LineMaterial;

    _inverseMatrix.copy(matrixWorld).invert();
    _ray.copy(raycaster.ray).applyMatrix4(_inverseMatrix);

    BoundingSphere: {
        if (geometry.boundingSphere === null) geometry.computeBoundingSphere();
        _sphere.copy(geometry.boundingSphere!);

        const distanceToSphere = Math.max(camera.near, _sphere.distanceToPoint(_ray.origin)); // increase the sphere bounds by the worst case line screen space width
        _clipToWorldVector.set(0, 0, - distanceToSphere, 1.0).applyMatrix4(camera.projectionMatrix);
        _clipToWorldVector.multiplyScalar(1.0 / _clipToWorldVector.w);
        _clipToWorldVector.applyMatrix4(camera.projectionMatrixInverse); // increase the sphere bounds by the worst case line screen space width
        const sphereMargin = getWorldSpaceHalfWidth(camera, distanceToSphere, linewidth, resolution);
        _sphere.radius += sphereMargin;
        if (!_ray.intersectsSphere(_sphere)) return;
    }

    // console.log("sphere check passed");

    BoundingBox: {
        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        _box.copy(geometry.boundingBox!);
        const distanceToBox = Math.max(camera.near, _box.distanceToPoint(_ray.origin)); // increase the box bounds by the worst case line screen space width
        const boxMargin = getWorldSpaceHalfWidth(camera, distanceToBox, linewidth, resolution);
        _box.max.x += boxMargin;
        _box.max.y += boxMargin;
        _box.max.z += boxMargin;
        _box.min.x -= boxMargin;
        _box.min.y -= boxMargin;
        _box.min.z -= boxMargin;
        if (!_ray.intersectsBox(geometry.boundingBox!)) return;
    }

    // console.log("bbbbb check passed");

    for (const edge of this) {
        if (!(edge instanceof CurveEdge)) throw new Error("Invalid edge");
        edge.raycast(raycaster, intersects);
    }
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
            _lineSegmentsGeometry.boundingBox = this.boundingBox!;
            _lineSegmentsGeometry.boundingSphere = this.boundingSphere!;
        }
    }

    _lineSegments.material = line.material;
    _lineSegments.geometry = _lineSegmentsGeometry;
    _lineSegments.matrixWorld.copy(line.matrixWorld);
    const is: THREE.Intersection[] = [];
    _lineSegments.raycast(raycaster, is);

    for (const i of is) {
        intersects.push({
            ...i,
            object: this,
        })
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
const _lineSegmentsGeometry = new LineSegmentsGeometry();
const _instanceBuffer = new THREE.InstancedInterleavedBuffer([], 6, 1); // xyz, xyz
_lineSegmentsGeometry.setAttribute('instanceStart', new THREE.InterleavedBufferAttribute(_instanceBuffer, 3, 0)); // xyz
_lineSegmentsGeometry.setAttribute('instanceEnd', new THREE.InterleavedBufferAttribute(_instanceBuffer, 3, 3)); // xyz

export { };
