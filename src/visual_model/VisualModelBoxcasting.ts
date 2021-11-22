import * as THREE from "three";
import { Boxcastable, IntersectionType, Boxcaster } from "../selection/Boxcaster";
import { CurveEdge, CurveGroup, Face, FaceGroup, PlaneInstance, Solid, SpaceInstance } from './VisualModel';

declare module './VisualModel' {
    interface Item extends Boxcastable { }
    interface FaceGroup extends Boxcastable { }
    interface CurveGroup<T> extends Boxcastable { }
    interface CurveEdge extends Boxcastable { }
    interface Face extends Boxcastable { }
}

Solids: {
    Solid.prototype.boxcast = function (type: IntersectionType, boxcaster: Boxcaster, selects: Boxcastable[]) {
        const low = this.lod.levels[1].object; // Lowest detail
        const edges = low.children[0] as CurveGroup<CurveEdge>;
        const faces = low.children[1] as FaceGroup;
        faces.boxcast(type, boxcaster, selects);
        edges.boxcast(type, boxcaster, selects);
        return selects;
    }

    Solid.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        const low = this.lod.levels[1].object; // Lowest detail
        const edges = low.children[0] as CurveGroup<CurveEdge>;
        const faces = low.children[1] as FaceGroup;
        return faces.intersectsBounds(boxcaster);
    }

    FaceGroup.prototype.boxcast = function (type: IntersectionType, boxcaster: Boxcaster, selects: Boxcastable[]) {
        if (type == 'contained') {
            for (const face of this) {
                selects.push(face);
            }
        } else if (type == 'intersected') {
            boxcaster.selectObjects([...this], selects);
        }
    }

    FaceGroup.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        const { matrixWorld, geometry } = this.mesh;

        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        _box.copy(geometry.boundingBox!);
        _box.applyMatrix4(matrixWorld);

        if (boxcaster.frustum.containsPoint(_box.min) && boxcaster.frustum.containsPoint(_box.max)) {
            return 'contained';
        } else if (boxcaster.frustum.intersectsBox(_box)) {
            return 'intersected';
        } else {
            return 'not-intersected';
        }
    }

    Face.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        const parent = this.parent as FaceGroup;
        const { matrixWorld } = parent.mesh;
        if (this.boundingBox === undefined) this.computeBoundingBox();
        _box.copy(this.boundingBox!);
        _box.applyMatrix4(matrixWorld);

        if (boxcaster.frustum.containsPoint(_box.min) && boxcaster.frustum.containsPoint(_box.max)) {
            return 'contained';
        } else if (boxcaster.frustum.intersectsBox(_box)) {
            return 'intersected';
        } else {
            return 'not-intersected';
        }
    }

    Face.prototype.boxcast = function (type: IntersectionType, boxcaster: Boxcaster, selects: Boxcastable[]) {
        if (type == 'contained') {
            selects.push(this);
        } else if (type == 'intersected') {
            boxcaster.selectGeometry(this, selects);
        }
    }

    Face.prototype.containsGeometry = function (boxcaster: Boxcaster) {
        const parent = this.parent as FaceGroup;
        const { matrixWorld, geometry } = parent.mesh;
        const { group } = this;
        const { drawRange } = geometry;
        const index = geometry.index!;

        const position = geometry.attributes.position;

        _frustum.copy(boxcaster.frustum);
        _inverseMatrix.copy(matrixWorld).invert();
        _frustum.applyMatrix4(_inverseMatrix);

        const start = Math.max(group.start, drawRange.start);
        const end = Math.min(index.count, Math.min((group.start + group.count), (drawRange.start + drawRange.count)));

        for (let i = start; i < end; i++) {
            const j = index.getX(i);
            _v.fromBufferAttribute(position, j);
            if (!_frustum.containsPoint(_v)) return false;
        }
        return true;
    }

    Face.prototype.intersectsGeometry = function (boxcaster: Boxcaster) {
        const parent = this.parent as FaceGroup;
        const { matrixWorld, geometry } = parent.mesh;
        const { group } = this;
        const { drawRange } = geometry;
        const index = geometry.index!;

        if (this.simpleName != 'face,1,5') return false;

        const position = geometry.attributes.position;

        _frustum.copy(boxcaster.frustum);
        _inverseMatrix.copy(matrixWorld).invert();
        _frustum.applyMatrix4(_inverseMatrix);

        const start = Math.max(group.start, drawRange.start);
        const end = Math.min(index.count, Math.min((group.start + group.count), (drawRange.start + drawRange.count)));

        for (let i = start; i < end; i++) {
            const j = index.getX(i);
            _v.fromBufferAttribute(position, j);
            if (_frustum.containsPoint(_v)) {
                return true;
            }
        }
        return false;
    }

    CurveGroup.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        const { mesh: { matrixWorld }, line: { geometry } } = this;

        if (geometry.boundingBox === null) geometry.computeBoundingBox();
        _box.copy(geometry.boundingBox!);
        _box.applyMatrix4(matrixWorld);

        if (boxcaster.frustum.containsPoint(_box.min) && boxcaster.frustum.containsPoint(_box.max)) {
            return 'contained';
        } else if (boxcaster.frustum.intersectsBox(_box)) {
            return 'intersected';
        } else {
            return 'not-intersected';
        }
    }

    CurveGroup.prototype.boxcast = function (type: IntersectionType, boxcaster: Boxcaster, selects: Boxcastable[]) {
        if (type == 'contained') {
            for (const edge of this) {
                selects.push(edge);
            }
        } else if (type == 'intersected') {
            boxcaster.selectObjects([...this], selects);
        }
    }

    CurveEdge.prototype.boxcast = function (type: IntersectionType, boxcaster: Boxcaster, selects: Boxcastable[]) {
        if (type == 'contained') {
            selects.push(this);
        } else if (type == 'intersected') {
            boxcaster.selectGeometry(this, selects);
        }
    }

    CurveEdge.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        const parent = this.parent as CurveGroup<CurveEdge>;
        const { line: { matrixWorld, geometry } } = parent;
        const { group } = this;
        if (this.boundingBox === undefined) this.computeBoundingBox();
        _box.copy(this.boundingBox!);
        _box.applyMatrix4(matrixWorld);

        if (boxcaster.frustum.containsPoint(_box.min) && boxcaster.frustum.containsPoint(_box.max)) {
            return 'contained';
        } else if (boxcaster.frustum.intersectsBox(_box)) {
            return 'intersected';
        } else {
            return 'not-intersected';
        }
    }

    CurveEdge.prototype.containsGeometry = function (boxcaster: Boxcaster) {
        const parent = this.parent as CurveGroup<CurveEdge>;
        const { line: { geometry, matrixWorld } } = parent;
        const { group } = this;

        const instanceStart = geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
        const array = instanceStart.data.array as Float32Array;

        _frustum.copy(boxcaster.frustum);
        _inverseMatrix.copy(matrixWorld).invert();
        _frustum.applyMatrix4(_inverseMatrix);

        const start = group.start / 3;
        const end = (group.start + group.count) / 3;

        for (let i = start; i <= end; i++) {
            _v.set(array[3 * i + 0], array[3 * i + 1], array[3 * i + 2]);
            if (!_frustum.containsPoint(_v)) return false;
        }
        return true;
    }

    CurveEdge.prototype.intersectsGeometry = function (boxcaster: Boxcaster) {
        const parent = this.parent as CurveGroup<CurveEdge>;
        const { line: { geometry, matrixWorld } } = parent;
        const { group } = this;

        const instanceStart = geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
        const instanceEnd = geometry.attributes.instanceEnd; // camera forward is negative
        const array = instanceStart.data.array as Float32Array;

        _frustum.copy(boxcaster.frustum);
        _inverseMatrix.copy(matrixWorld).invert();
        _frustum.applyMatrix4(_inverseMatrix);

        const start = group.start / 3 / 2;
        const end = (group.start + group.count) / 3 / 2;

        for (let i = start; i <= end; i++) {
            _line.start.fromBufferAttribute(instanceStart, i);
            _line.end.fromBufferAttribute(instanceEnd, i);

            if (_frustum.containsPoint(_line.start)) return true;
            if (_frustum.containsPoint(_line.end)) return true;
            if (_frustum.intersectsLine(_line)) return true;
        }
        return false;
    }
}

Curves: {
    SpaceInstance.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        return 'intersected';
    }
}

Regions: {
    PlaneInstance.prototype.intersectsBounds = function (boxcaster: Boxcaster) {
        return 'intersected';
    }
}

class FastFrustum extends THREE.Frustum {
    applyMatrix4(matrix: THREE.Matrix4) {
        for (const plane of this.planes) {
            plane.applyMatrix4(matrix);
        }
        return this;
    }

    intersectsLine(line: THREE.Line3): boolean {
        for (const plane of this.planes) {
            if (plane.intersectsLine(line)) return true;
        }
        return false;
    }
}

const _frustum = new FastFrustum();
const _start = new THREE.Vector3();
const _end = new THREE.Vector3();
const _v = new THREE.Vector3();
const _inverseMatrix = new THREE.Matrix4();
const _box = new THREE.Box3();
const _line = new THREE.Line3();

export { };
