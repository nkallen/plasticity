import { CompositeDisposable, Disposable, DisposableLike } from 'event-kit';
import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../../build/Release/c3d.node';
import { BetterRaycastingPoints } from '../util/BetterRaycastingPoints';
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
    get levels() { return this.lod.children as T[] }
    disposable = new CompositeDisposable();
}

export class PlaneInstance<T extends PlaneItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.lod.children[0] as T }
    disposable = new CompositeDisposable();
}

// This only extends THREE.Object3D for type-compatibility with raycasting
// If you remove it and the system typechecks (in ControlPointGroup.raycast()), 
// then it's no longer necessary.
export class ControlPoint extends THREE.Object3D {
    constructor(
        readonly parentItem: SpaceInstance<Curve3D>,
        readonly points: ControlPointGroup,
        readonly index: number,
        readonly simpleName: string
    ) {
        super()
    }

    get geometry() { return this.points.points }
}

export type FragmentInfo = { start: number, stop: number, untrimmedAncestor: SpaceInstance<Curve3D> };

export class Curve3D extends SpaceItem {
    disposable = new CompositeDisposable();
    readonly line: Line2;
    readonly points: ControlPointGroup;

    static build(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, points: ControlPointGroup, material: LineMaterial): Curve3D {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);

        const built = new Curve3D(line, points, edge.name, edge.simpleName);

        built.layers.set(Layers.Curve);
        line.layers.set(Layers.Curve);

        return built;
    }

    private constructor(line: Line2, points: ControlPointGroup, name: c3d.Name, simpleName: number) {
        super();
        this.add(line);
        this.add(points);
        this.points = points;
        this.line = line;
        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.renderOrder = RenderOrder.CurveSegment;
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        if (!this.layers.test(raycaster.layers)) return;

        this.points.raycast(raycaster, intersects);
        
        const is: THREE.Intersection[] = [];
        this.line.raycast(raycaster, is);
        if (is.length > 0) {
            const i = is[0];
            i.object = this;
            intersects.push(i);
        }
    }

    get fragmentInfo(): FragmentInfo | undefined {
        const layer = new THREE.Layers();
        layer.set(Layers.CurveFragment);
        if (!this.layers.test(layer)) return undefined;
        return this.userData as FragmentInfo;
    }

    befragment(start: number, stop: number, ancestor: SpaceInstance<Curve3D>) {
        this.layers.set(Layers.CurveFragment);
        this.line.layers.set(Layers.CurveFragment);
        this.userData.start = start;
        this.userData.stop = stop;
        this.userData.untrimmedAncestor = ancestor;
        // FIXME rethink this -- but fragments don't need control points, and we don't want them ever being visible/raycast targets/
        this.points.clear();
    }
}

export class Surface extends SpaceItem {
    disposable = new CompositeDisposable();
}

export class Region extends PlaneItem {
    private readonly mesh: THREE.Mesh;
    get child() { return this.mesh };
    disposable = new CompositeDisposable();

    static build(grid: c3d.MeshBuffer, material: THREE.Material): Region {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        // geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3)); // FIXME

        const mesh = new THREE.Mesh(geometry, material);
        const built = new Region(mesh);

        built.layers.set(Layers.Region);
        mesh.layers.set(Layers.Region);
        return built;
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

    get simpleName() { return this.parentItem.simpleName }
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
    get index(): number { return this.userData.index }
}

export abstract class Edge extends TopologyItem { }

export class CurveEdge extends Edge {
    get child() { return this.line };

    static build(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial): CurveEdge {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.computeLineDistances();
        const result = new CurveEdge(line, occludedLine);
        result.userData.name = edge.name;
        result.userData.simpleName = `edge,${parentId},${edge.i}`;
        result.userData.index = edge.i;

        result.layers.set(Layers.CurveEdge);
        result.traverse(child => child.layers.set(Layers.CurveEdge))

        return result;
    }

    private constructor(private readonly line: Line2, readonly occludedLine: Line2) {
        super()
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

    static simpleName(parentId: c3d.SimpleName, index: number) {
        return `face,${parentId},${index}`;
    }

    static build(grid: c3d.MeshBuffer, parentId: c3d.SimpleName, material: THREE.Material): Face {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
        const mesh = new THREE.Mesh(geometry, material);
        const result = new Face(mesh);
        result.userData.name = grid.name;
        result.userData.simpleName = this.simpleName(parentId, grid.i);
        result.userData.index = grid.i;

        result.layers.set(Layers.Face);
        result.traverse(child => child.layers.set(Layers.Face))

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

// Control points are a bit more complicated than other items. There isn't a c3d object equivalent,
// they're just referred to by indexes. For performance reasons, with THREE.js we aggregate all
// points into a THREE.Points object; so where we might want an object to refer to an
// individual point, we "fake" it by creating a dummy object (cf findByIndex). Performance
// optimizations aside, we do our usual raycast proxying to children, but we also have a completely
// different screen-space raycasting algorithm in BetterRaycastingPoints.
export class ControlPointGroup extends THREE.Object3D {
    static build(item: c3d.SpaceItem, parentId: c3d.SimpleName, material: THREE.PointsMaterial): ControlPointGroup {
        let points: c3d.CartPoint3D[] = [];
        switch (item.Type()) {
            case c3d.SpaceType.PolyCurve3D: {
                const controlPoints = item.Cast<c3d.PolyCurve3D>(c3d.SpaceType.PolyCurve3D).GetPoints();
                points = points.concat(controlPoints);
                break;
            }
            case c3d.SpaceType.Contour3D: {
                const contour = item.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
                const segs = contour.GetSegmentsCount();
                if (!contour.IsClosed()) points.push(contour.GetLimitPoint(1));
                const start = contour.IsClosed() ? 0 : 1;
                for (let i = start; i < segs; i++) points.push(contour.FindCorner(i));
                if (!contour.IsClosed()) points.push(contour.GetLimitPoint(2));
                break;
            }
            default: {
                const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
                points.push(curve.GetLimitPoint(1));
                if (!curve.IsClosed()) points.push(curve.GetLimitPoint(2));
                break;
            }
        }
        return ControlPointGroup.fromCartPoints(points, parentId, material);
    }

    private static fromCartPoints(ps: c3d.CartPoint3D[], parentId: c3d.SimpleName, material: THREE.PointsMaterial): ControlPointGroup {
        let positions, colors;
        positions = new Float32Array(ps.length * 3);
        colors = new Float32Array(ps.length * 3);
        for (const [i, p] of ps.entries()) {
            positions[i * 3 + 0] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
            colors[i * 3 + 0] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const points = new BetterRaycastingPoints(geometry, material);

        const result = new ControlPointGroup(ps.length, points);
        result.layers.set(Layers.ControlPoint);
        points.layers.set(Layers.ControlPoint);
        result.userData.parentId = parentId;
        return result;
    }

    private constructor(readonly length = 0, readonly points?: THREE.Points) {
        super();
        if (points !== undefined) this.add(points);
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent?.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    findByIndex(i: number): ControlPoint | undefined {
        if (i >= this.length) throw new Error("invalid precondition");
        return new ControlPoint(
            this.parentItem,
            this,
            i,
            `${this.parentId},${i}`);
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i++) {
            yield this.findByIndex(i) as ControlPoint;
        }
    }

    get parentId(): number { return this.userData.parentId }

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        if (!raycaster.layers.test(this.layers)) return;
        if (this.points === undefined) return;

        const is: THREE.Intersection[] = [];
        this.points.raycast(raycaster, is);
        if (is.length > 0) {
            const i = is[0];
            i.object = this.findByIndex(i.index!)!;
            intersects.push(i);
        }
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

export class RecursiveGroup extends THREE.Group { }
applyMixins(RecursiveGroup, [RaycastsRecursively]);

/**
 * Similarly, for Face and CurveEdge, they are simple proxy/wrappers around their one child.
 * Their parents are LOD objects.
 */

abstract class ObjectWrapper<T extends THREE.BufferGeometry = THREE.BufferGeometry, M extends THREE.Material | THREE.Material[] = THREE.Material | THREE.Material[]>
    extends THREE.Object3D {
    abstract get parentItem(): Item;
    abstract child: THREE.Mesh<T, M>;
    get geometry() { return this.child.geometry };

    raycast(raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) {
        const is = raycaster.intersectObject(this.child);
        if (is.length > 0) {
            const i = is[0];
            i.object = this;
            intersects.push(i);
        }
    }
}

export interface Face extends ObjectWrapper { }
export interface CurveEdge extends ObjectWrapper<LineGeometry, LineMaterial> { }
// export interface Curve3D extends ObjectWrapper<LineGeometry, LineMaterial> { }
export interface Region extends ObjectWrapper { }

applyMixins(Face, [ObjectWrapper]);
applyMixins(CurveEdge, [ObjectWrapper]);
// applyMixins(Curve3D, [ObjectWrapper]);
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
        const built = this.solid;
        built.layers.set(Layers.Solid);
        return built;
    }
}

export class SpaceInstanceBuilder<T extends SpaceItem> {
    private readonly instance = new SpaceInstance<T>();

    addLOD(t: T, distance?: number) {
        this.instance.lod.addLevel(t, distance);
        this.instance.disposable.add(new Disposable(() => t.dispose()));
    }

    build(): SpaceInstance<T> {
        const built = this.instance;
        return built;
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
    private faceGroup = new FaceGroup();

    addFace(face: Face) {
        this.faceGroup.add(face);
        this.faceGroup.disposable.add(new Disposable(() => face.dispose()));
    }

    build() {
        return this.faceGroup;
    }
}

export class CurveEdgeGroupBuilder {
    private curveEdgeGroup = new CurveEdgeGroup();

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

export enum Layers {
    Default,

    Overlay,
    ViewportGizmo,
    ObjectGizmo,

    XRay,
    CurveFragment,

    Solid,
    Curve,
    Region,

    ControlPoint,
    Face,
    CurveEdge,
}

export const VisibleLayers = new THREE.Layers();
VisibleLayers.enableAll();
VisibleLayers.disable(Layers.CurveFragment);
VisibleLayers.disable(Layers.ControlPoint);

export const SelectableLayers = new THREE.Layers();
SelectableLayers.enableAll();
SelectableLayers.disable(Layers.CurveFragment);
SelectableLayers.disable(Layers.ControlPoint);
