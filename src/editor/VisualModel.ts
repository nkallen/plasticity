import { DisposableLike } from 'event-kit';
import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../../build/Release/c3d.node';
import { BetterRaycastingPoint, BetterRaycastingPoints } from '../util/BetterRaycastingPoints';
import { applyMixins } from '../util/Util';
import MaterialDatabase from './MaterialDatabase';

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
    abstract dispose(): void;
}

export abstract class PlaneItem extends THREE.Object3D {
    private _useNominal: undefined;
    abstract dispose(): void;
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
    // the higher detail ones are later
    get edges() { return this.lod.children[this.lod.children.length - 1].children[0] as CurveEdgeGroup }
    get faces() { return this.lod.children[this.lod.children.length - 1].children[1] as FaceGroup }
    get outline() {
        const result = [];
        for (const child of this.lod.children) {
            result.push(child.children[1]);
        }
        return result;
    }

    get allEdges() {
        let result: CurveEdge[] = [];
        for (const lod of this.lod.children) {
            const edges = lod.children[0] as CurveEdgeGroup;
            result = result.concat([...edges]);
        }
        return result;
    }

    get allFaces() {
        let result: Face[] = [];
        for (const lod of this.lod.children) {
            const faces = lod.children[1] as FaceGroup;
            result = result.concat([...faces]);
        }
        return result;
    }

    dispose() {
        for (const level of this.lod.children) {
            const edges = level.children[0] as CurveEdgeGroup;
            const faces = level.children[1] as FaceGroup;

            edges.dispose();
            faces.dispose();
        }
    }

    bemodify(ancestor: Solid) {
        this.layers.set(Layers.ModifiedSolid);
        for (const edge of this.allEdges) edge.parent?.remove(edge);

        for (const face of this.allFaces) {
            face.traverse(child => child.layers.set(Layers.ModifiedFace));
        }
    }

    premodify(successor: Solid) {
        this.layers.set(Layers.PremodifiedSolid);

        for (const face of this.allFaces) {
            face.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = invisible;
                }
            });
        }
    }
}

const invisible = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
});

export class SpaceInstance<T extends SpaceItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.lod.children[this.lod.children.length - 1] as T }
    get levels() { return this.lod.children as T[] }

    dispose() {
        for (const l of this.levels) l.dispose();
    }
}

export class PlaneInstance<T extends PlaneItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.lod.children[this.lod.children.length - 1] as T }
    get levels() { return this.lod.children as T[] }

    dispose() {
        for (const l of this.levels) l.dispose();
    }
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

export class CurveSegment extends THREE.Object3D {
    static build(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial): CurveSegment {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);

        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.computeLineDistances();

        const built = new CurveSegment(line, occludedLine, edge.name, edge.simpleName);

        built.layers.set(Layers.Curve);
        line.layers.set(Layers.Curve);
        occludedLine.layers.set(Layers.Curve);

        return built;
    }

    private constructor(readonly line: Line2, readonly occludedLine: Line2, name: c3d.Name, simpleName: number) {
        super();
        this.add(line, occludedLine);
        occludedLine.renderOrder = line.renderOrder = RenderOrder.CurveEdge;

        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.renderOrder = RenderOrder.CurveSegment;
    }

    // get parentItem(): SpaceInstance<Curve3D> {
    //     const result = this.parent?.parent?.parent;
    //     if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
    //     return result;
    // }

    dispose() {
        this.line.geometry.dispose();
        this.occludedLine.geometry.dispose();
    }
}

export class Curve3D extends SpaceItem {
    constructor(readonly segments: CurveSegmentGroup, readonly points: ControlPointGroup) {
        super();
        this.add(segments, points);
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    get fragmentInfo(): FragmentInfo | undefined {
        const layer = new THREE.Layers();
        layer.set(Layers.CurveFragment);
        if (!this.layers.test(layer)) return undefined;
        return this.userData as FragmentInfo;
    }

    befragment(start: number, stop: number, ancestor: SpaceInstance<Curve3D>) {
        this.layers.set(Layers.CurveFragment);
        this.traverse(child => child.layers.set(Layers.CurveFragment));

        this.userData.start = start;
        this.userData.stop = stop;
        this.userData.untrimmedAncestor = ancestor;
        // FIXME rethink this -- but fragments don't need control points, and we don't want them ever being visible/raycast targets/
        this.points.clear();
    }

    dispose() {
        this.segments.dispose();
        this.points.dispose();
    }
}

export class Surface extends SpaceItem {
    static build(grid: c3d.MeshBuffer, material: THREE.Material): Surface {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));

        const mesh = new THREE.Mesh(geometry, material);
        const built = new Surface(mesh);

        built.layers.set(Layers.Surface);
        mesh.layers.set(Layers.Surface);
        return built;
    }

    private constructor(private readonly mesh: THREE.Mesh) {
        super()
        this.renderOrder = RenderOrder.Face;
        this.add(mesh);
    }

    get parentItem(): SpaceInstance<Surface> {
        const result = this.parent!.parent as SpaceInstance<Surface>;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    get simpleName() { return this.parentItem.simpleName }

    dispose() {
        this.mesh.geometry.dispose();
    }
}

export class Region extends PlaneItem {
    get child() { return this.mesh };

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

    private constructor(private readonly mesh: THREE.Mesh) {
        super()
        this.renderOrder = RenderOrder.Face;
        this.add(mesh);
    }

    get simpleName() { return this.parentItem.simpleName }

    dispose() {
        this.mesh.geometry.dispose();
    }
}

export abstract class TopologyItem extends THREE.Object3D {
    private _useNominal: undefined;

    get parentItem(): Solid {
        const result = this.parent?.parent?.parent?.parent;
        if (!(result instanceof Solid)) {
            console.error(this);
            throw new Error("Invalid precondition");
        }
        return result as Solid;
    }

    get simpleName(): string { return this.userData.simpleName }
    get index(): number { return this.userData.index }

    abstract dispose(): void;
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

    dispose() {
        this.line.geometry.dispose();
        this.occludedLine.geometry.dispose();
    }
}
export class Vertex {
    static build(edge: c3d.EdgeBuffer, material: LineMaterial) {
    }
}

export class Face extends TopologyItem {
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

    private constructor(private readonly mesh: THREE.Mesh) {
        super()
        this.renderOrder = RenderOrder.Face;
        this.add(mesh);
    }

    dispose() {
        this.mesh.geometry.dispose();
    }
}

export class CurveEdgeGroup extends THREE.Group {
    private _useNominal: undefined;

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as CurveEdge;
        }
    }

    get(i: number): CurveEdge {
        return this.children[i] as CurveEdge;
    }

    dispose() {
        for (const edge of this) edge.dispose();
    }
}

export class CurveSegmentGroup extends THREE.Group {
    private _useNominal: undefined;

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as CurveSegment;
        }
    }

    get(i: number): CurveSegment {
        return this.children[i] as CurveSegment;
    }

    dispose() {
        for (const segment of this) segment.dispose();
    }
}


export class FaceGroup extends THREE.Group {
    private _useNominal: undefined;

    *[Symbol.iterator]() {
        for (const child of this.children) {
            yield child as Face;
        }
    }

    get(i: number): Face {
        return this.children[i] as Face;
    }

    dispose() {
        for (const face of this) face.dispose();
    }
}

// Control points are a bit more complicated than other items. There isn't a c3d object equivalent,
// they're just referred to by indexes. For performance reasons, with THREE.js we aggregate all
// points into a THREE.Points object; so where we might want an object to refer to an
// individual point, we "fake" it by creating a dummy object (cf findByIndex). Performance
// optimizations aside, we do our usual raycast proxying to children, but we also have a completely
// different screen-space raycasting algorithm in BetterRaycastingPoints.
export class ControlPointGroup extends THREE.Group {
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

    findByIndex(i: number): ControlPoint {
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

    dispose() {
        this.points?.geometry.dispose();
    }
}

/**
 * Finally, we have some builder functions to enforce type-safety when building the object graph.
 */

export class SolidBuilder {
    private readonly solid = new Solid();

    addLOD(edges: CurveEdgeGroup, faces: FaceGroup, distance?: number) {
        const level = new THREE.Group();
        level.add(edges);
        level.add(faces);
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
    }

    build(): PlaneInstance<T> {
        return this.instance;
    }
}

export class FaceGroupBuilder {
    private faceGroup = new FaceGroup();

    addFace(face: Face) {
        this.faceGroup.add(face);
    }

    build() {
        return this.faceGroup;
    }
}

export class CurveEdgeGroupBuilder {
    private curveEdgeGroup = new CurveEdgeGroup();

    addEdge(edge: CurveEdge) {
        this.curveEdgeGroup.add(edge);
    }

    build() {
        return this.curveEdgeGroup;
    }
}

export class CurveSegmentGroupBuilder {
    private curveSegmentGroup = new CurveSegmentGroup();

    addSegment(segment: CurveSegment) {
        this.curveSegmentGroup.add(segment);
    }

    build() {
        return this.curveSegmentGroup;
    }
}

export class Curve3DBuilder {
    private segments!: CurveSegmentGroup;
    private points!: ControlPointGroup;

    addSegments(segments: CurveSegmentGroup) {
        this.segments = segments;
    }

    addControlPoints(points: ControlPointGroup) {
        this.points = points;
    }

    build(): Curve3D {
        const built = new Curve3D(this.segments, this.points!);
        built.layers.set(Layers.Curve);
        return built;
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
    Surface,

    ControlPoint,
    Face,
    CurveEdge,

    ModifiedSolid,
    ModifiedFace,
    ModifiedCurveEdge,

    PremodifiedSolid,
    PremodifiedFace,
    PremodifiedCurveEdge,
}

export const VisibleLayers = new THREE.Layers();
VisibleLayers.enableAll();
VisibleLayers.disable(Layers.CurveFragment);
VisibleLayers.disable(Layers.ControlPoint);
VisibleLayers.disable(Layers.ModifiedCurveEdge);

export const SelectableLayers = new THREE.Layers();
SelectableLayers.enableAll();
SelectableLayers.disable(Layers.CurveFragment);
SelectableLayers.disable(Layers.ControlPoint);
SelectableLayers.disable(Layers.ModifiedFace);
SelectableLayers.disable(Layers.ModifiedCurveEdge);

export type Selectable = Item | TopologyItem | ControlPoint | Region;

// The following two methods are used for raycast (point and click) and box selection --
// They take primitive view objects (Line2, Mesh, etc.), filter out the irrelevant (invisible, etc.),
// and return higher level view objects (Face, CurveEdge, Region, etc.).

export function select(selected: THREE.Mesh[]): Set<Selectable> {
    const set = new Set<Selectable>();
    for (const object of selected) {
        if (!isSelectable(object)) continue;

        const selectable = findSelectable(object);
        set.add(selectable);
    }
    return set;
}

export interface Intersection {
    object: Selectable;
    point: THREE.Vector3;
    distance: number;
}

export function filter(intersections: THREE.Intersection[]): Intersection[] {
    const map = new Map<Selectable, [THREE.Vector3, number]>();
    for (const intersection of intersections) {
        const { object, point, distance } = intersection;
        if (!isSelectable(object)) continue;

        const selectable = findSelectable(intersection.object, intersection.index);
        map.set(selectable, [point, distance]);
    }
    const result: Intersection[] = [];
    for (const [object, [point, distance]] of map) {
        result.push({ object, point, distance });
    }
    result.sort((a, b) => a.distance - b.distance);
    return result;
}

function isSelectable(object: THREE.Object3D): boolean {
    if (!object.layers.test(SelectableLayers)) return false;

    let parent: THREE.Object3D | null = object;
    while (parent) {
        if (!parent.visible) return false;
        parent = parent.parent;
    }
    return true;
}

function findSelectable(object: THREE.Object3D, index?: number): Selectable {
    if (object instanceof BetterRaycastingPoint) {
        const controlPointGroup = object.parent.parent! as ControlPointGroup;
        if (!(controlPointGroup instanceof ControlPointGroup))
            throw new Error("invalid precondition: " + parent.constructor.name);
        return controlPointGroup.findByIndex(object.index)!;
    } else {
        const parent = object.parent!;
        if (parent instanceof Item || parent instanceof TopologyItem || parent instanceof Region)
            return parent as Selectable;
        if (parent instanceof CurveSegment)
            return parent.parent!.parent! as Item;

        throw new Error("invalid precondition: " + parent.constructor.name);
    }
}