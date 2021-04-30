import { CompositeDisposable, Disposable, DisposableLike } from 'event-kit';
import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../build/Release/c3d.node';
import { Snap } from "./SnapManager";
import { applyMixins } from './util/Util';

/**
 * This class hierarchy mirrors the c3d hierarchy into the THREE.js Object3D hierarchy.
 * This allows view objects to have type safety and polymorphism/encapsulation where appropriate.
 * 
 * We want a class hierarchy like CurveEdge <: Edge <: TopologyItem, and Face <: TopologyItem
 * but we also want CurveEdge <: Line2 and Face <: Mesh. But this requires multiple inheritance/mixins.
 * And that's principally what's going on in this file.
 */

export abstract class SpaceItem extends THREE.Object3D {
    private _useNominal: undefined;
}
export abstract class Item extends SpaceItem {
    private _useNominal2: undefined;
    lod = new THREE.LOD();

    constructor() {
        super();
        this.add(this.lod);
    }
}
export class Solid extends Item {
    disposable = new CompositeDisposable();
    get edges() { return this.lod.children[0].children[0] as CurveEdgeGroup }
    get faces() { return this.lod.children[0].children[1] as FaceGroup }
    get outline() {
        const result = [];
        for (const child of this.lod.children) {
            result.push(child.children[1]);
        }
        return result;
    }
}

export class SpaceInstance<T extends SpaceItem> extends Item {
    disposable = new CompositeDisposable();
    get material() {
        const firstChild = this.lod.children[0] as THREE.Object3D & { material: any }
        return firstChild.material;
    };
    set material(m: LineMaterial) {
        for (const child of this.lod.children) {
            const hasMaterial = child as THREE.Object3D & { material: any };
            hasMaterial.material = m;
        }
    };
}

export class Curve3D extends SpaceItem {
    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as CurveSegment;
        }
    }

    get material() { return (this.children[0] as CurveSegment).material }
}
export abstract class TopologyItem extends THREE.Object3D {
    private _useNominal: undefined;

    get parentItem(): Item {
        const result = this.parent?.parent?.parent?.parent;
        if (!(result instanceof Item)) throw "Invalid precondition";
        return result as Item;
    }
}
export class Edge extends TopologyItem {
}
export class CurveEdge extends Edge {
    private readonly line: Line2;
    // set material(m: LineMaterial) { this.line.material = m };
    get child() { return this.line };
    readonly snaps = new Set<Snap>();

    constructor(edge: c3d.EdgeBuffer, material: LineMaterial, occludedMaterial: LineMaterial) {
        super()
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        this.userData.name = edge.name;
        this.userData.simpleName = edge.simpleName;
        this.add(line);
        this.line = line;

        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.computeLineDistances();
        this.add(occludedLine);
        occludedLine.renderOrder = this.line.renderOrder = RenderOrder.CurveEdge;
    }
}

export class CurveSegment extends SpaceItem { // This doesn't correspond to a real c3d class, but it's here for convenience
    private readonly line: Line2;
    get geometry() { return this.line.geometry };
    get material() { return this.line.material };
    set material(m: LineMaterial) { this.line.material = m; };

    constructor(edge: c3d.EdgeBuffer, material: LineMaterial) {
        super()
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        this.userData.name = edge.name;
        this.userData.simpleName = edge.simpleName;
        this.renderOrder = RenderOrder.CurveSegment;
        this.add(line);
        this.line = line;
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent as SpaceInstance<Curve3D>;
        if (!(result instanceof SpaceInstance)) throw "Invalid precondition";
        return result;
    }
}
export class Face extends TopologyItem {
    readonly snaps = new Set<Snap>();
    private readonly mesh: THREE.Mesh;
    get child() { return this.mesh };

    constructor(grid: c3d.MeshBuffer, material: THREE.Material) {
        super()
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
        const mesh = new THREE.Mesh(geometry, material);
        this.mesh = mesh;
        this.userData.name = grid.name;
        this.userData.simpleName = grid.simpleName;
        this.renderOrder = RenderOrder.Face;
        this.add(mesh);
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
 * In order to deal with garbage collection issues around geometry disposal, we also mixin
 * some basic dispose utilities
 */
abstract class GeometryDisposable<T extends THREE.BufferGeometry> {
    abstract get geometry(): T;
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
 * We also want some recursive raycasting behavior:
 */

abstract class RaycastsRecursively {
    abstract children: THREE.Object3D[];

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const children = this.children;

        for (const child of this.children) {
            child.raycast(raycaster, intersects);
        }
    }
}

applyMixins(Solid, [RaycastsRecursively]);
applyMixins(SpaceInstance, [RaycastsRecursively]);
applyMixins(FaceGroup, [RaycastsRecursively]);
applyMixins(CurveEdgeGroup, [RaycastsRecursively]);

class RecursiveGroup extends THREE.Group { }
applyMixins(RecursiveGroup, [RaycastsRecursively]);

/**
 * Similarly, for Face and CurveEdge, they are simple proxy/wrappers around their one child:
 */

abstract class ObjectWrapper<T extends THREE.BufferGeometry> extends THREE.Object3D {
    abstract child: THREE.Mesh;
    get geometry(): T { return this.child.geometry as T };
    get material() { return this.child.material };
    set material(m: THREE.Material | THREE.Material[]) { this.child.material = m };

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const is: THREE.Intersection[] = [];
        this.child.raycast(raycaster, is);
        if (is.length > 0) {
            const i = is[0];
            i.object = this;
            intersects.push(i);
        }
    }
}

export interface Face extends ObjectWrapper<THREE.BufferGeometry> { }
export interface CurveEdge extends ObjectWrapper<LineGeometry> { }

applyMixins(Face, [ObjectWrapper]);
applyMixins(CurveEdge, [ObjectWrapper]);

/**
 * Finally, we have some builder functions to enforce type-safety when building the object graph.
 */

export class Curve3DBuilder {
    private readonly curve3D = new Curve3D();

    build() { return this.curve3D }

    addCurveSegment(segment: CurveSegment) {
        this.curve3D.add(segment);
    }
}

export class SolidBuilder {
    private readonly solid = new Solid();

    addLOD(edges: CurveEdgeGroup, faces: FaceGroup, distance?: number) {
        const level = new RecursiveGroup();
        level.add(edges);
        level.add(faces);
        this.solid.disposable.add(new Disposable(() => edges.dispose()));
        this.solid.disposable.add(new Disposable(() => faces.dispose()));
        this.solid.lod.addLevel(level, distance);
    }

    build(): Solid {
        return this.solid;
    }
}

export class SpaceInstanceBuilder<T extends SpaceItem> {
    private readonly instance = new SpaceInstance();

    addLOD(t: T, distance?: number) {
        this.instance.lod.addLevel(t, distance);
        this.instance.disposable.add(new Disposable(() => t.dispose()));
    }

    build(): SpaceInstance<T> {
        return this.instance;
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