import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { Disposable, DisposableLike, CompositeDisposable } from 'event-kit';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { applyMixins } from './Util';
import { Snap } from "./SnapManager";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { Object3D } from "three";

/**
 * This class hierarchy mirrors the c3d hierarchy into the THREE.js Object3D hierarchy.
 * This allows view objects to have type safety and polymorphism/encapsulation where appropriate.
 * 
 * We want a class hierarchy like CurveEdge <: Edge <: TopologyItem, and Face <: TopologyItem
 * but we also want CurveEdge <: Line2 and Face <: Mesh. But this requires multiple inheritance/mixins.
 * And that's principally what's going on in this file.
 */

export abstract class SpaceItem { }
export abstract class Item extends SpaceItem { }
export class Solid extends Item {
    disposable = new CompositeDisposable()
    edges: CurveEdgeGroup;
    faces: FaceGroup;

    constructor() {
        super();
        THREE.Object3D.call(this);
    }
}
export class SpaceInstance extends Item {
    constructor(underlying: SpaceItem) {
        super();
        THREE.Object3D.call(this);
        this.add(underlying);
    }

    get underlying(): SpaceItem {
        return this.children[0] as SpaceItem;
    }
}
export class Curve3D extends SpaceItem {
    disposable = new CompositeDisposable()

    constructor() {
        super();
        THREE.Object3D.call(this);
    }

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as CurveSegment;
        }
    }
}
export abstract class TopologyItem {
    get parentItem() {
        return this.parent.parent as Item;
    }
}
export class Edge extends TopologyItem { }
export class CurveEdge extends Edge {
    readonly snaps = new Set<Snap>();

    constructor(edge: c3d.EdgeBuffer, material: LineMaterial, occludedMaterial: LineMaterial) {
        super()
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        Line2.call(this, geometry, material);
        this.userData.name = edge.name;
        this.userData.simpleName = edge.simpleName;
        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.computeLineDistances();
        this.add(occludedLine);
        this.renderOrder = 999;
    }
}
export class CurveSegment extends SpaceItem { // This doesn't correspond to a real c3d class, but it's here for convenience
    constructor(edge: c3d.EdgeBuffer, material: LineMaterial) {
        super()
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        Line2.call(this, geometry, material);
        this.userData.name = edge.name;
        this.userData.simpleName = edge.simpleName;
    }

    get parentItem() {
        return this.parent.parent as SpaceInstance;
    }
}
export class Face extends TopologyItem {
    readonly snaps = new Set<Snap>();

    constructor(grid: c3d.MeshBuffer, material: THREE.Material) {
        super()
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
        THREE.Mesh.call(this, geometry, material);
        this.userData.name = grid.name;
        this.userData.simpleName = grid.simpleName;
    }
}

export class CurveEdgeGroup extends THREE.Group {
    disposable = new CompositeDisposable();

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as CurveEdge;
        }
    }
}
export class FaceGroup extends THREE.Group {
    disposable = new CompositeDisposable();
}

/**
 * With the object hierarchy establish, we now mixin the THREE.js behavior
 */

export interface SpaceItem extends THREE.Object3D { }
export interface TopologyItem extends THREE.Object3D { }
export interface CurveSegment extends Line2 { }
export interface CurveEdge extends Line2 { }
export interface Face extends THREE.Mesh { }

applyMixins(Solid, [THREE.Object3D, THREE.EventDispatcher]);
applyMixins(SpaceInstance, [THREE.Object3D, THREE.EventDispatcher]);
applyMixins(Curve3D, [THREE.Object3D, THREE.EventDispatcher]);
applyMixins(Edge, [Line2, LineSegments2, THREE.Mesh, THREE.Object3D, THREE.EventDispatcher]);
applyMixins(CurveSegment, [Line2, LineSegments2, THREE.Mesh, THREE.Object3D, THREE.EventDispatcher]);
applyMixins(Face, [THREE.Mesh, THREE.Object3D, THREE.EventDispatcher]);

/**
 * In order to deal with garbage collection issues around geometry disposal, we also mixin
 * some basic dispose utilities
 */
abstract class GeometryDisposable<T extends THREE.BufferGeometry> {
    abstract geometry: T;
    dispose() { this.geometry.dispose() }
}

export interface SpaceItem extends DisposableLike { }

export interface Face extends GeometryDisposable<THREE.BufferGeometry> { }
export interface CurveEdge extends GeometryDisposable<LineGeometry> { }
export interface CurveSegment extends GeometryDisposable<LineGeometry> { }
applyMixins(Face, [GeometryDisposable]);
applyMixins(CurveEdge, [GeometryDisposable]);
applyMixins(CurveSegment, [GeometryDisposable]);

abstract class HasDisposable {
    abstract disposable: Disposable;
    dispose() { this.disposable.dispose(); }
}

export interface Curve3D extends HasDisposable { }
export interface Solid extends HasDisposable { }
export interface CurveEdgeGroup extends HasDisposable { };
export interface FaceGroup extends HasDisposable { }

applyMixins(Curve3D, [HasDisposable]);
applyMixins(Solid, [HasDisposable]);
applyMixins(FaceGroup, [HasDisposable]);
applyMixins(CurveEdgeGroup, [HasDisposable]);

/**
 * Finally, we have some builder functions to enforce type-safety when building the object graph.
 */

export class Curve3DBuilder {
    private readonly curve3D = new Curve3D();

    build() { return this.curve3D }

    addCurveSegment(segment: CurveSegment) {
        this.curve3D.add(segment);
        // this.curve3D.disposable.add(new Disposable(() => segment.dispose()));
    }
}

export class SolidBuilder {
    private readonly solid = new Solid();

    addEdges(edges: CurveEdgeGroup) {
        this.solid.edges = edges;
        this.solid.add(edges);
        this.solid.disposable.add(new Disposable(() => edges.dispose()));
    }

    addFaces(faces: FaceGroup) {
        this.solid.faces = faces;
        this.solid.add(faces);
        this.solid.disposable.add(new Disposable(() => faces.dispose()));
    }

    build() {
        return this.solid;
    }
}

export class FaceGroupBuilder {
    faceGroup = new FaceGroup();

    addFace(face: Face) {
        this.faceGroup.add(face);
        this.faceGroup.disposable.add(new Disposable(() => face.dispose()));
    }

    build() {
        return this.faceGroup;
    }
}

export class CurveEdgeGroupBuilder {
    curveEdgeGroup = new CurveEdgeGroup();

    addEdge(edge: CurveEdge) {
        this.curveEdgeGroup.add(edge);
        this.curveEdgeGroup.disposable.add(new Disposable(() => edge.dispose()));
    }

    build() {
        return this.curveEdgeGroup;
    }
}
