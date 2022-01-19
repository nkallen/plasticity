import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import c3d from '../../build/Release/c3d.node';
import { deunit } from "../util/Conversion";
import { CurveSegmentGroupBuilder } from "./VisualModelBuilder";
import { BetterRaycastingPoints } from "./VisualModelRaycasting";

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
    get simpleName(): c3d.SimpleName { return this.userData.simpleName }

    private readonly identity = new THREE.Matrix4();
    get isTemporaryOptimization() {
        return !this.matrixWorld.equals(this.identity);
    }
}

class SolidLOD extends THREE.LOD {
    get low() { return this.children[0] as SolidLevel }
    get high() { return this.children[this.children.length - 1] as SolidLevel }
    get all() { return this.children as SolidLevel[] }
}

export class SolidLevel extends THREE.Group {
    constructor(readonly edges: CurveGroup<CurveEdge>, readonly faces: FaceGroup) {
        super();
        this.add(edges);
        this.add(faces);
    }

    clone(recursive?: boolean): this {
        return new THREE.Object3D().copy(this, recursive) as this;
    }
}

export class Solid extends Item {
    private _useNominal3: undefined;
    readonly lod = new SolidLOD();

    constructor() {
        super();
        this.add(this.lod);
    }

    get edges() { return this.lod.high.edges }
    get faces() { return this.lod.high.faces }

    private _outline?: THREE.Object3D;
    get outline(): THREE.Object3D | undefined {
        if (!this.visible) return;
        if (this._outline === undefined) this._outline = this.computeOutline();
        this.matrixWorld.decompose(this._outline.position, this._outline.quaternion, this._outline.scale);
        return this._outline;
    }

    private computeOutline() {
        const mesh = this.faces.mesh;
        const faces = mesh.clone();
        if (Array.isArray(faces.material)) {
            faces.material = faces.material[0];
        }
        faces.geometry = faces.geometry.clone();
        faces.geometry.clearGroups();

        // We parent this ONLY so we can apply Solid-level transformations
        const parentShim = new THREE.Object3D();
        parentShim.add(faces);
        return parentShim;
    }

    get allEdges() {
        let result: CurveEdge[] = [];
        for (const lod of this.lod.all) {
            const edges = lod.edges;
            result = result.concat([...edges]);
        }
        return result;
    }

    get allFaces() {
        let result: Face[] = [];
        for (const lod of this.lod.all) {
            const faces = lod.faces;
            result = result.concat([...faces]);
        }
        return result;
    }

    dispose() {
        for (const level of this.lod.all) {
            const { edges, faces } = level;

            edges.dispose();
            faces.dispose();
        }
    }

    clone(recursive?: boolean): this {
        return new THREE.Object3D().copy(this, recursive) as this;
    }
}

export class SpaceInstance<T extends SpaceItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.children[0] as T }
    dispose() { this.underlying.dispose() }
}

export class PlaneInstance<T extends PlaneItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.children[0] as T }
    dispose() { this.underlying.dispose() }
}

export class ControlPoint extends THREE.Object3D {
    static simpleName(parentId: c3d.SimpleName, index: number) {
        return `control-point,${parentId},${index}`;
    }

    readonly simpleName: string;

    constructor(
        readonly parentItem: SpaceInstance<Curve3D>,
        readonly points: THREE.Points,
        readonly index: number
    ) {
        super();
        this.simpleName = ControlPoint.simpleName(parentItem.simpleName, index);
    }

    get geometry() { return this.points.geometry }
}

export type FragmentInfo = { start: number, stop: number, untrimmedAncestor: SpaceInstance<Curve3D> };

export class CurveSegment extends THREE.Object3D {
    constructor(readonly group: Readonly<GeometryGroup>, userData: any) {
        super();
        this.userData = userData;
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent!.parent!.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    dispose() { }
}

export class Curve3D extends SpaceItem {
    static build(segments: CurveSegmentGroupBuilder, points: ControlPointGroup) {
        return new Curve3D(segments.build(), points);
    }

    constructor(readonly segments: CurveGroup<CurveSegment>, readonly points: ControlPointGroup) {
        super();
        this.add(segments, points);
        this.layers.set(Layers.Curve);
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    get fragmentInfo(): FragmentInfo | undefined {
        if (!this.isFragment) return undefined;
        return this.userData as FragmentInfo;
    }

    befragment(start: number, stop: number, ancestor: SpaceInstance<Curve3D>) {
        this.name = "fragment";
        this.userData.start = start;
        this.userData.stop = stop;
        this.userData.untrimmedAncestor = ancestor;
        this.points.dispose();
    }

    get isFragment(): boolean {
        return !!this.userData.untrimmedAncestor;
    }

    get line() { return this.segments.line }
    get occludedLine() { return this.segments.occludedLine }

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
        mesh.scale.setScalar(0.01);
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
        const result = this.parent as SpaceInstance<Surface>;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    get simpleName() { return this.parentItem.simpleName }

    dispose() { this.mesh.geometry.dispose() }
}

export class Region extends PlaneItem {
    get parentItem(): PlaneInstance<Region> {
        const result = this.parent as PlaneInstance<Region>;
        if (!(result instanceof PlaneInstance)) throw new Error("Invalid precondition");
        return result;
    }

    constructor(readonly mesh: THREE.Mesh) {
        super()
        this.add(mesh);
    }

    get simpleName() { return this.parentItem.simpleName }
    dispose() { this.mesh.geometry.dispose() }
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
    static simpleName(parentId: c3d.SimpleName, index: number) {
        return `edge,${parentId},${index}`;
    }

    constructor(readonly group: Readonly<GeometryGroup>, userData: any) {
        super();
        this.userData = userData;
        this.layers.set(Layers.CurveEdge);
        this.visible = false; // FIXME: this is just a performance optimization; we really need to remove CurveEdge and Face from the scene
    }

    slice(kind: 'line' | 'line2' = 'line2') {
        if (kind == 'line') return this.parentItem.edges.slice([this], kind);
        else return this.parentItem.edges.slice([this], kind);
    }

    dispose() { }
}

export class Vertex {
    static build(edge: c3d.EdgeBuffer, material: LineMaterial) { }
}

export type GeometryGroup = { start: number; count: number; materialIndex?: number | undefined };

export class GeometryGroupUtils {
    static compact(groups: Readonly<GeometryGroup>[]): GeometryGroup[] {
        const first = groups.shift();
        if (first === undefined) return [];
        if (groups.length === 0) return [first];

        let start = first.start;
        let count = first.count;
        let position = start + count;

        const result = [];
        for (const group of groups) {
            if (group.start === position) {
                count += group.count;
                position += group.count;
            } else {
                result.push({ start, count });
                start = group.start;
                count = group.count;
                position = start + count;
            }
        }
        result.push({ start, count });
        return result;
    }
}

export class Face extends TopologyItem {
    static simpleName(parentId: c3d.SimpleName, index: number) {
        return `face,${parentId},${index}`;
    }

    constructor(readonly group: Readonly<GeometryGroup>, readonly grid: c3d.Grid, userData: any) {
        super();
        this.userData = userData;
        this.layers.set(Layers.Face);
        this.visible = false;  // FIXME: this is just a performance optimization; we really need to remove CurveEdge and Face from the scene
    }

    // FIXME: delete this 
    makeSnap(): THREE.Mesh {
        const faceGroup = this.parent as FaceGroup;
        const geometry = new THREE.BufferGeometry();
        const original = faceGroup.mesh.geometry;
        geometry.attributes = original.attributes;
        geometry.index = original.index;
        geometry.boundingBox = original.boundingBox;
        geometry.boundingSphere = original.boundingSphere;
        geometry.addGroup(this.group.start, this.group.count, 0);
        const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
        mesh.scale.setScalar(deunit(1));
        return mesh;
    }

    dispose() { }
}

export class CurveGroup<T extends CurveEdge | CurveSegment> extends THREE.Group {
    private _useNominal: undefined;

    readonly temp = new THREE.Group();
    constructor(readonly mesh: THREE.Group, readonly edges: ReadonlyArray<T>) {
        super();
        if (edges.length > 0) this.add(...edges);
        this.add(this.temp);
        this.add(this.mesh);
    }

    *[Symbol.iterator]() {
        for (const edge of this.edges) yield edge as T;
    }

    get(i: number): T {
        return this.edges[i];
    }

    slice(edges: T[], kind?: 'line2'): LineSegments2;
    slice(edges: T[], kind?: 'line'): THREE.Line;
    slice(edges: T[], kind: 'line' | 'line2' = 'line2'): THREE.Line | LineSegments2 {
        const instanceStart = this.line.geometry.attributes.instanceStart as THREE.InterleavedBufferAttribute;
        const inArray = instanceStart.data.array as Float32Array;
        const inBuffer = Buffer.from(inArray.buffer);

        let size = 0;
        for (const edge of edges) size += edge.group.count;
        const outBuffer = Buffer.alloc(size * 4);
        let offset = 0;
        for (const edge of edges) {
            const group = edge.group;
            const next = (group.start + group.count) * 4;
            inBuffer.copy(outBuffer, offset, group.start * 4, next);
            offset += group.count * 4;
        }
        const points = new Float32Array(outBuffer.buffer);
        if (kind == 'line2') {
            const geometry = new LineSegmentsGeometry();
            geometry.setPositions(points);
            // Fast clone: this code is brittle but has been measured to offer a significant boost
            const line = new LineSegments2(geometry, this.line.material);
            line.scale.copy(this.line.scale);
            line.matrixWorld.copy(this.line.matrixWorld);
            line.renderOrder = this.line.renderOrder;
            return line;
        } else {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(points, 3));
            const result = new THREE.Line();
            result.copy(this.line as any);
            result.geometry = geometry;
            result.material = new THREE.LineBasicMaterial();
            return result;
        }
    }

    get line() { return this.mesh.children[0] as LineSegments2 }
    get occludedLine() { return this.mesh.children[1] as LineSegments2 }

    dispose() {
        for (const edge of this.edges) edge.dispose();
        for (const child of this.mesh.children) {
            if (!(child instanceof LineSegments2)) throw new Error("invalid precondition");
            child.geometry.dispose();
        }
    }

    clone(recursive?: boolean): this {
        return new THREE.Object3D().copy(this) as this;
    }
}

export class FaceGroup extends THREE.Group {
    private _useNominal: undefined;

    constructor(readonly mesh: THREE.Mesh, readonly faces: ReadonlyArray<Face>, readonly groups: ReadonlyArray<GeometryGroup>) {
        super();
        this.add(mesh);
        this.add(...faces);
    }

    *[Symbol.iterator]() {
        for (const face of this.faces) yield face;
    }

    get(i: number): Face { return this.faces[i] }

    dispose() {
        for (const face of this.faces) face.dispose();
        this.mesh.geometry.dispose();
    }

    clone(recursive?: boolean): this {
        return new THREE.Object3D().copy(this) as this;
    }

    get allGroup(): GeometryGroup {
        const index = this.mesh.geometry.index!;
        return { start: 0, count: index.count }
    }
}

export class ControlPointGroup extends THREE.Object3D {
    constructor(readonly length = 0, readonly points: BetterRaycastingPoints) {
        super();
        this.add(points);
        this.layers.set(Layers.ControlPoint);
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i++) {
            yield this.get(i);
        }
    }

    get(i: number): ControlPoint {
        const point = new ControlPoint(this.parentItem, this.points, i);
        point.position.fromBufferAttribute(this.points.geometry.attributes.position, i);
        return point;
    }

    get geometry() { return this.points.geometry }

    dispose() {
        this.points.geometry.dispose();
        this.clear();
    }
}

export const RenderOrder = {
    CurveEdge: 20,
    Face: 10,
    CurveSegment: 20,
}

export enum Layers {
    Default,

    Overlay,
    ViewportGizmo,
    ObjectGizmo,

    XRay,

    CurveFragment,
    CurveFragment_XRay,

    Solid,
    Curve,
    Region,
    Surface,

    ControlPoint,
    Face,
    CurveEdge,

    Unselectable,
}

import("./VisualModelRaycasting");
import("./VisualModelBuilder");
import("./VisualModelBoxcasting");