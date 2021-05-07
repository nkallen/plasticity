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
 * 
 * At the time of writing, the OBJECT graph hierarchy (not the class hierarchy) is like:
 *
 * * Solid -> LOD -> RecursiveGroup -> FaceGroup -> Face
 * * Solid -> LOD -> RecursiveGroup -> CurveEdgeGroup -> CurveEdge
 * * SpaceInstance -> LOD -> Curve3D -> CurveSegment
 */

export abstract class SpaceItem extends THREE.Object3D {
    private _useNominal: undefined;
}

class LOD extends THREE.LOD {
    duplicate(source: this, registry: Map<any, any>) {
        this.autoUpdate = source.autoUpdate;
        for (const level of source.levels) {
            const o = level.object as unknown as CloneWithRegistry;
            this.addLevel(o.duplicate(registry), level.distance);
        }
        return this;
    }

    clone(recursive?: boolean): THREE.Object3D { throw new Error("Don't call") }
    copy(source: this, recursive?: boolean): this { throw new Error("Don't call") }
}

export abstract class Item extends SpaceItem {
    private _useNominal2: undefined;
    readonly lod = new LOD();

    constructor() {
        super();
        this.add(this.lod);
    }

    duplicate(registry: Map<any, any> = new Map()): THREE.Object3D {
        if (registry.has(this)) return registry.get(this);

        const result = this.clone(false) as this;
        result.lod.duplicate(this.lod, registry);
        return result;
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

export class SpaceInstance<T extends Curve3D> extends Item {
    get underlying() { return this.lod.children[0] as T }
    disposable = new CompositeDisposable();
    get material() {
        const firstChild = this.underlying as unknown as { material: any }
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

    get(i: number): CurveSegment {
        return this.children[i] as CurveSegment;
    }

    get material() { return (this.children[0] as CurveSegment).material }
    set material(m: LineMaterial) {
        for (const child of this.children) {
            const seg = child as CurveSegment;
            seg.child.material = m; // using child because to avoid LOD sync code from doing unneccessary work
        }
    }
}

export abstract class TopologyItem extends THREE.Object3D {
    private _useNominal: undefined;

    get parentItem(): Item {
        const result = this.parent?.parent?.parent?.parent;
        if (!(result instanceof Item)) throw "Invalid precondition";
        return result as Item;
    }
}

export class Edge extends TopologyItem { }

export class CurveEdge extends Edge {
    private readonly line: Line2;
    private readonly occludedLine: Line2;
    get child() { return this.line };
    readonly snaps = new Set<Snap>();

    static build(edge: c3d.EdgeBuffer, material: LineMaterial, occludedMaterial: LineMaterial) {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.computeLineDistances();
        return new CurveEdge(line, occludedLine, edge.name, edge.simpleName);
    }

    private constructor(line: Line2, occludedLine: Line2, name: c3d.Name, simpleName: number) {
        super()
        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.name = String(simpleName);
        this.add(line);
        this.line = line;
        this.occludedLine = occludedLine;
        this.add(occludedLine);
        occludedLine.renderOrder = line.renderOrder = RenderOrder.CurveEdge;
    }

    clone(recursive?: boolean): THREE.Object3D {
        const line = this.line.clone(recursive) as Line2;
        const occludedLine = this.occludedLine.clone(recursive) as Line2;

        return new CurveEdge(line, occludedLine, this.userData.name, this.userData.simpleName);
    }
}

// FIXME rethink name and the fact that it extends SpaceItem
export class CurveSegment extends SpaceItem { // This doesn't correspond to a real c3d class, but it's here for convenience
    private readonly line: Line2;
    get child() { return this.line };

    static build(edge: c3d.EdgeBuffer, material: LineMaterial) {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        return new CurveSegment(line, edge.name, edge.simpleName);
    }

    private constructor(line: Line2, name: c3d.Name, simpleName: number) {
        super();
        this.add(line);
        this.line = line;
        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.name = String(simpleName)
        this.renderOrder = RenderOrder.CurveSegment;
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent?.parent as SpaceInstance<Curve3D>;
        if (!(result instanceof SpaceInstance)) throw "Invalid precondition";
        return result;
    }

    clone(recursive?: boolean): THREE.Object3D {
        const line = this.line.clone(recursive) as Line2;
        const result = new CurveSegment(line, this.userData.name, this.userData.simpleName);
        result.copy(this, recursive);
        return result;
    }
}

export class Face extends TopologyItem {
    readonly snaps = new Set<Snap>();
    private readonly mesh: THREE.Mesh;
    get child() { return this.mesh };

    static build(grid: c3d.MeshBuffer, material: THREE.Material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
        const mesh = new THREE.Mesh(geometry, material);
        return new Face(mesh, grid.name, grid.simpleName);
    }

    private constructor(mesh: THREE.Mesh, name: c3d.Name, simpleName: number) {
        super()
        this.mesh = mesh;
        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.name = String(simpleName);
        this.renderOrder = RenderOrder.Face;
        this.add(mesh);
    }

    clone(recursive?: boolean): THREE.Object3D {
        const mesh = this.mesh.clone(recursive) as THREE.Mesh;
        const result = new Face(mesh, this.userData.name, this.userData.simpleName);
        result.copy(this, recursive);
        return result;
    }

    duplicate(registry: Map<any, any> = new Map()): this {
        if (registry.has(this)) return registry.get(this);

        return this.clone(false) as this;
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
 * We also want some recursive raycasting behavior. Why don't we just use instersectObjects(recursive: true)?
 * Well, LOD is incompatible with it since all of the levels are just normal children.
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
applyMixins(FaceGroup, [RaycastsRecursively]);
applyMixins(CurveEdgeGroup, [RaycastsRecursively]);
applyMixins(SpaceInstance, [RaycastsRecursively]);
applyMixins(Curve3D, [RaycastsRecursively]);

class RecursiveGroup extends THREE.Group { }
applyMixins(RecursiveGroup, [RaycastsRecursively]);

/**
 * Similarly, for Face and CurveEdge, they are simple proxy/wrappers around their one child.
 * Their parents are LOD objects, and keeping materials synchronized across peers at
 * different levels is a whole thing.
 */

abstract class ObjectWrapper<T extends THREE.BufferGeometry, M extends THREE.Material>
    extends THREE.Object3D {
    abstract get parentItem(): Item;
    abstract child: THREE.Mesh;
    get geometry(): T { return this.child.geometry as T };
    get material(): M { return this.child.material as M };
    set material(m: M) {
        const parent = this.parentItem;
        const lod = parent.lod;
        const twins = lod.getObjectByName(this.name);
        if (!this.name) throw "invalid precondition";
        lod.traverse(o => {
            if (o.name === this.name) {
                const q = o as this;
                q.child.material = m;
            }
        })
    };

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

export interface Face extends ObjectWrapper<THREE.BufferGeometry, THREE.Material> { }
export interface CurveEdge extends ObjectWrapper<LineGeometry, LineMaterial> { }
export interface CurveSegment extends ObjectWrapper<LineGeometry, LineMaterial> { }

applyMixins(Face, [ObjectWrapper]);
applyMixins(CurveEdge, [ObjectWrapper]);
applyMixins(CurveSegment, [ObjectWrapper]);

/**
 * For the undo history, we need to clone the visual representation of objects.
 * Normal THREE.js clone() behavior is good but we also need to ensure we don't
 * clone the same object twice, thus we pass a registry around.
 */

abstract class CloneWithRegistry {
    abstract clone(recursive?: boolean): THREE.Object3D;
    abstract children: THREE.Object3D[];
    abstract add(...object: THREE.Object3D[]): this;

    duplicate(registry: Map<any, any> = new Map()): THREE.Object3D {
        if (registry.has(this)) return registry.get(this);

        const result = this.clone(false);
        for (const child of this.children) {
            const c = child as unknown as this;
            result.add(c.duplicate(registry));
        }
        return result;
    }
}

export interface CurveSegment extends CloneWithRegistry { };
export interface FaceGroup extends CloneWithRegistry { };
export interface CurveEdgeGroup extends CloneWithRegistry { };
export interface Curve3D extends CloneWithRegistry { };

applyMixins(FaceGroup, [CloneWithRegistry]);
applyMixins(CurveEdgeGroup, [CloneWithRegistry]);
applyMixins(Curve3D, [CloneWithRegistry]);
applyMixins(RecursiveGroup, [CloneWithRegistry]);

abstract class FlatDuplicate<T extends THREE.Object3D> {
    abstract clone(recursive?: boolean): T;

    duplicate(registry: Map<any, any> = new Map()): T {
        if (registry.has(this)) return registry.get(this);

        return this.clone(false) as T;
    }
}

applyMixins(TopologyItem, [FlatDuplicate]);
applyMixins(CurveEdge, [FlatDuplicate]);
applyMixins(CurveSegment, [FlatDuplicate]);

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

export class SpaceInstanceBuilder<T extends Curve3D> {
    private readonly instance = new SpaceInstance<T>();

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