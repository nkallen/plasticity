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
}

export class Solid extends Item {
    private _useNominal3: undefined;
    readonly lod = new THREE.LOD();

    constructor() {
        super();
        this.add(this.lod);
    }

    // the higher detail ones are later
    get edges() { return this.lod.children[this.lod.children.length - 1].children[0] as CurveGroup<CurveEdge> }
    get faces() { return this.lod.children[this.lod.children.length - 1].children[1] as FaceGroup }

    get outline() {
        if (!this.visible) return [];
        return this.faces;
    }

    get allEdges() {
        let result: CurveEdge[] = [];
        for (const lod of this.lod.children) {
            const edges = lod.children[0] as CurveGroup<CurveEdge>;
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
            const edges = level.children[0] as CurveGroup<CurveEdge>;
            const faces = level.children[1] as FaceGroup;

            edges.dispose();
            faces.dispose();
        }
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

    dispose() { }
}

export class Curve3D extends SpaceItem {
    static build(segments: CurveSegmentGroupBuilder, points: ControlPointGroup) {
        return new Curve3D(segments.build(), points);
    }

    constructor(readonly segments: CurveGroup<CurveSegment>, readonly points: ControlPointGroup) {
        super();
        this.add(segments, points);
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
    }

    slice() {
        return this.parentItem.edges.slice([this]);
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

    slice(edges: T[]): LineSegments2 {
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
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(new Float32Array(outBuffer.buffer));
        const line = this.line.clone();
        line.geometry = geometry;
        return line;
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
}

export class ControlPointGroup extends THREE.Object3D {
    constructor(readonly length = 0, readonly points: BetterRaycastingPoints) {
        super();
        this.add(points);
    }

    get parentItem(): SpaceInstance<Curve3D> {
        const result = this.parent?.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    *[Symbol.iterator]() {
        const parentItem = this.parentItem;
        for (let i = 0; i < this.length; i++) {
            yield new ControlPoint(parentItem, this.points, i);
        }
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