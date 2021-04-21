import { CompositeDisposable, Disposable, DisposableLike } from 'event-kit';
import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import c3d from '../build/Release/c3d.node';
import { Snap } from "./SnapManager";
import { applyMixins } from './Util';

/**
 * This class hierarchy mirrors the c3d hierarchy into the THREE.js Object3D hierarchy.
 * This allows view objects to have type safety and polymorphism/encapsulation where appropriate.
 * 
 * We want a class hierarchy like CurveEdge <: Edge <: TopologyItem, and Face <: TopologyItem
 * but we also want CurveEdge <: Line2 and Face <: Mesh. But this requires multiple inheritance/mixins.
 * And that's principally what's going on in this file.
 */

export abstract class SpaceItem {
    private _useNominal: undefined;
}
export abstract class Item extends SpaceItem { }
export class Solid extends Item {
    disposable = new CompositeDisposable()
    edges!: CurveEdgeGroup;
    faces!: FaceGroup;

    constructor() {
        super();
        THREE.Object3D.call(this);
    }
}

export class SpaceInstance<T extends SpaceItem> extends Item {
    constructor(underlying: SpaceItem) {
        super();
        THREE.Object3D.call(this);
        this.add(underlying);
    }

    get underlying(): T {
        return this.children[0] as T;
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

    get material() { return (this.children[0] as CurveSegment).material }
}
export abstract class TopologyItem {
    private _useNominal: undefined;

    get parentItem(): Item {
        return this.parent?.parent as Item;
    }
}
export class Edge extends TopologyItem {
}
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
        occludedLine.renderOrder = this.renderOrder = RenderOrder.CurveEdge;
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
        this.renderOrder = RenderOrder.CurveSegment;
    }

    get parentItem(): SpaceInstance<Curve3D> {
        return this.parent?.parent as SpaceInstance<Curve3D>;
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
        this.renderOrder = RenderOrder.Face;
    }
}

export class CurveEdgeGroup extends THREE.Group {
    private _useNominal: undefined;
    disposable = new CompositeDisposable();

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as CurveEdge;
        }
    }

    get(i: number): CurveEdge {
        return this.children[i] as CurveEdge;
    }
}
export class FaceGroup extends THREE.Group {
    private _useNominal: undefined;
    disposable = new CompositeDisposable();

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as Face;
        }
    }

    get(i: number): Face {
        return this.children[i] as Face;
    }
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

    addEdges(edges: CurveEdgeGroup): void {
        this.solid.edges = edges;
        this.solid.add(edges);
        this.solid.disposable.add(new Disposable(() => edges.dispose()));
    }

    addFaces(faces: FaceGroup): void {
        this.solid.faces = faces;
        this.solid.add(faces);
        this.solid.disposable.add(new Disposable(() => faces.dispose()));
    }

    build(): Solid {
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

const RenderOrder = {
    CurveEdge: 10,
    Face: 1,
    CurveSegment: 1,
}