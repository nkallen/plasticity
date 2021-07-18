import { CompositeDisposable, Disposable, DisposableLike } from 'event-kit';
import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../../build/Release/c3d.node';
import { applyMixins } from '../util/Util';

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

export abstract class PlaneItem extends THREE.Object3D {
    private _useNominal: undefined;
}

export abstract class Item extends SpaceItem {
    private _useNominal2: undefined;
    readonly lod = new THREE.LOD();

    constructor() {
        super();
        this.add(this.lod);
    }

    get simpleName(): c3d.SimpleName { return this.userData.simpleName }
}

export class Solid extends Item {
    private _useNominal3: undefined;
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
    private _useNominal3: undefined;
    get underlying() { return this.lod.children[0] as T }
    disposable = new CompositeDisposable();
}

export class PlaneInstance<T extends PlaneItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.lod.children[0] as T }
    disposable = new CompositeDisposable();
}

export class Curve3D extends SpaceItem {
    disposable = new CompositeDisposable();
    private readonly line: Line2;
    get child() { return this.line };

    static build(edge: c3d.EdgeBuffer, material: LineMaterial) {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        return new Curve3D(line, edge.name, edge.simpleName);
    }

    private constructor(line: Line2, name: c3d.Name, simpleName: number) {
        super();
        this.add(line);
        this.line = line;
        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.renderOrder = RenderOrder.CurveSegment;
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent as SpaceInstance<Curve3D>;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }
}

export class Surface extends SpaceItem {
    disposable = new CompositeDisposable();
}

export class Region extends PlaneItem {
    private readonly mesh: THREE.Mesh;
    get child() { return this.mesh };
    disposable = new CompositeDisposable();

    static build(grid: c3d.MeshBuffer, material: THREE.Material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        // geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3)); // FIXME
        const mesh = new THREE.Mesh(geometry, material);
        return new Region(mesh);
    }

    get parentItem(): PlaneInstance<Region> {
        const result = this.parent!.parent as PlaneInstance<Region>;
        if (!(result instanceof PlaneInstance)) throw new Error("Invalid precondition");
        return result;
    }

    private constructor(mesh: THREE.Mesh) {
        super()
        this.mesh = mesh;
        this.renderOrder = RenderOrder.Face;
        this.add(mesh);
        this.disposable.add(new Disposable(() => this.mesh.geometry.dispose()))
    }
}

export abstract class TopologyItem extends THREE.Object3D {
    private _useNominal: undefined;

    get parentItem(): Item {
        const result = this.parent?.parent?.parent?.parent;
        if (!(result instanceof Item)) {
            console.error(this);
            throw new Error("Invalid precondition");
        }
        return result as Item;
    }

    get simpleName(): string { return this.userData.simpleName }
}

export abstract class Edge extends TopologyItem { }

export class CurveEdge extends Edge {
    private readonly line: Line2;
    private readonly occludedLine: Line2;
    get child() { return this.line };

    static build(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial) {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.computeLineDistances();
        const result = new CurveEdge(line, occludedLine);
        result.userData.name = edge.name;
        result.userData.simpleName = `${parentId},${edge.i}`;
        result.userData.index = edge.i;
        return result;
    }

    private constructor(line: Line2, occludedLine: Line2) {
        super()
        this.line = line;
        this.occludedLine = occludedLine;
        this.add(line, occludedLine);
        occludedLine.renderOrder = line.renderOrder = RenderOrder.CurveEdge;
    }
}
export class Vertex {
    static build(edge: c3d.EdgeBuffer, material: LineMaterial) {

        
    }
}

export class Face extends TopologyItem {
    private readonly mesh: THREE.Mesh;
    get child() { return this.mesh };

    static build(grid: c3d.MeshBuffer, parentId: c3d.SimpleName, material: THREE.Material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
        const mesh = new THREE.Mesh(geometry, material);
        const result =  new Face(mesh);
        result.userData.name = grid.name;
        result.userData.simpleName = `${parentId},${grid.i}`
        result.userData.index = grid.i;
        return result;
    }

    private constructor(mesh: THREE.Mesh) {
        super()
        this.mesh = mesh;
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
export interface PlaneItem extends DisposableLike { }

export interface Face extends GeometryDisposable<THREE.BufferGeometry> { }
export interface CurveEdge extends GeometryDisposable<LineGeometry> { }
export interface Curve3D extends GeometryDisposable<LineGeometry> { }
applyMixins(Face, [GeometryDisposable]);
applyMixins(CurveEdge, [GeometryDisposable]);
applyMixins(Curve3D, [GeometryDisposable]);

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
applyMixins(SpaceInstance, [HasDisposable]);
applyMixins(PlaneInstance, [HasDisposable]);
applyMixins(FaceGroup, [HasDisposable]);
applyMixins(CurveEdgeGroup, [HasDisposable]);
applyMixins(Region, [HasDisposable]);

/**
 * We also want some recursive raycasting behavior. Why don't we just use instersectObjects(recursive: true)?
 * Well, LOD is incompatible with it since all of the levels are just normal children.
 */

abstract class RaycastsRecursively {
    abstract children: THREE.Object3D[];

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        for (const child of this.children) {
            child.raycast(raycaster, intersects);
        }
    }
}

applyMixins(Solid, [RaycastsRecursively]);
applyMixins(FaceGroup, [RaycastsRecursively]);
applyMixins(CurveEdgeGroup, [RaycastsRecursively]);
applyMixins(SpaceInstance, [RaycastsRecursively]);
applyMixins(PlaneInstance, [RaycastsRecursively]);
applyMixins(Curve3D, [RaycastsRecursively]);

export class RecursiveGroup extends THREE.Group { }
applyMixins(RecursiveGroup, [RaycastsRecursively]);

/**
 * Similarly, for Face and CurveEdge, they are simple proxy/wrappers around their one child.
 * Their parents are LOD objects, and keeping materials synchronized across peers at
 * different levels is a whole thing.
 */

abstract class ObjectWrapper<T extends THREE.BufferGeometry = THREE.BufferGeometry, M extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]>
    extends THREE.Object3D {
    abstract get parentItem(): Item;
    abstract child: THREE.Mesh<T, M>;
    get geometry() { return this.child.geometry };

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

export interface Face extends ObjectWrapper { }
export interface CurveEdge extends ObjectWrapper<LineGeometry, LineMaterial> { }
export interface Curve3D extends ObjectWrapper<LineGeometry, LineMaterial> { }
export interface Region extends ObjectWrapper { }

applyMixins(Face, [ObjectWrapper]);
applyMixins(CurveEdge, [ObjectWrapper]);
applyMixins(Curve3D, [ObjectWrapper]);
applyMixins(Region, [ObjectWrapper]);

/**
 * Finally, we have some builder functions to enforce type-safety when building the object graph.
 */

export class SurfaceBuilder {
    private readonly surface = new Surface();

    build() { return this.surface }
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
    private readonly instance = new SpaceInstance<T>();

    addLOD(t: T, distance?: number) {
        this.instance.lod.addLevel(t, distance);
        this.instance.disposable.add(new Disposable(() => t.dispose()));
    }

    build(): SpaceInstance<T> {
        return this.instance;
    }
}

export class PlaneInstanceBuilder<T extends PlaneItem> {
    private readonly instance = new PlaneInstance<T>();

    addLOD(t: T, distance?: number) {
        this.instance.lod.addLevel(t, distance);
        this.instance.disposable.add(new Disposable(() => t.dispose()));
    }

    build(): PlaneInstance<T> {
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