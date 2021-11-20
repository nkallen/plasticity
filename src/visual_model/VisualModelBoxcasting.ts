import * as THREE from "three";
import { Boxcastable, IntersectionType, SelectionBox } from "../selection/SelectionBox";
import { CurveEdge, CurveGroup, Face, FaceGroup, PlaneInstance, Solid, SpaceInstance } from './VisualModel';

declare module './VisualModel' {
    interface Item extends Boxcastable { }
    interface FaceGroup extends Boxcastable { }
    interface Face extends Boxcastable { }
}

Solids: {
    Solid.prototype.boxcast = function (type: IntersectionType, boxcaster: SelectionBox, selects: Boxcastable[]) {
        const low = this.lod.levels[1].object; // Lowest detail
        const edges = low.children[0] as CurveGroup<CurveEdge>;
        const faces = low.children[1] as FaceGroup;
        return faces.boxcast(type, boxcaster, selects);
    }

    Solid.prototype.intersectsBounds = function (boxcaster: SelectionBox) {
        const low = this.lod.levels[1].object; // Lowest detail
        const edges = low.children[0] as CurveGroup<CurveEdge>;
        const faces = low.children[1] as FaceGroup;
        return faces.intersectsBounds(boxcaster);
    }

    FaceGroup.prototype.boxcast = function (type: IntersectionType, boxcaster: SelectionBox, selects: Boxcastable[]) {
        if (type == 'contained') {
            for (const face of this) {
                selects.push(face);
            }
        } else if (type == 'intersected') {
            boxcaster.selectObjects([...this], selects);
        }
    }

    // FIXME: this could just return a bounding box?
    FaceGroup.prototype.intersectsBounds = function (boxcaster: SelectionBox) {
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

    Face.prototype.intersectsBounds = function (boxcaster: SelectionBox) {
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

    Face.prototype.boxcast = function (type: IntersectionType, boxcaster: SelectionBox, selects: Boxcastable[]) {
        if (type == 'contained') {
            selects.push(this);
        } else if (type == 'intersected') {
            if (this.containsGeometry(boxcaster)) {
                selects.push(this);
            }
        }
    }

    // FaceGroup.prototype.intersectsGeometry = function (boxcaster: SelectionBox) {
    //     const { matrixWorld, geometry } = this.mesh;

    //     const index = geometry.index;
    //     const position = geometry.attributes.position;

    //     const drawRange = geometry.drawRange;
    //     const start = Math.max(0, drawRange.start);
    //     const end = Math.min(position.count, (drawRange.start + drawRange.count));

    //     _frustum.copy(boxcaster.frustum);
    //     _inverseMatrix.copy(matrixWorld).invert();
    //     _frustum.applyMatrix4(_inverseMatrix);

    //     for (let i = start; i < end; i++) {
    //         _v.fromBufferAttribute(position, i);

    //         if (_frustum.containsPoint(_v)) return true;
    //     }

    //     return false;
    // }

    Face.prototype.containsGeometry = function (boxcaster: SelectionBox) {
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
}

Curves: {
    SpaceInstance.prototype.intersectsBounds = function (boxcaster: SelectionBox) {
        return 'intersected';
    }
}

Regions: {
    PlaneInstance.prototype.intersectsBounds = function (boxcaster: SelectionBox) {
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
}

const _sphere = new THREE.Sphere();
const _frustum = new FastFrustum();
const _center = new THREE.Vector3();
const _v = new THREE.Vector3();
const _inverseMatrix = new THREE.Matrix4();
const _box = new THREE.Box3();

export { };
