import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import c3d from '../../build/Release/c3d.node';
import { GeometryGPUPickingAdapter } from "../components/viewport/gpu_picking/GeometryGPUPickingAdapter";
import { IdMaterial, LineVertexColorMaterial, vertexColorLineMaterial, VertexColorMaterial, vertexColorMaterial } from "../components/viewport/gpu_picking/GPUPickingMaterial";
import { BetterRaycastingPoints } from '../util/BetterRaycastingPoints';
import { computeControlPointInfo, deunit, point2point } from "../util/Conversion";
import { GConstructor } from "../util/Util";

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
    abstract get picker(): THREE.Object3D
    abstract dispose(): void;
}

export abstract class PlaneItem extends THREE.Object3D {
    private _useNominal: undefined;
    abstract get picker(): THREE.Object3D
    abstract dispose(): void;
}

export abstract class Item extends SpaceItem {
    private _useNominal2: undefined;
    abstract get picker(): THREE.Object3D
    get simpleName(): c3d.SimpleName { return this.userData.simpleName }
}

export class Solid extends Item {
    readonly lod = new THREE.LOD();

    constructor() {
        super();
        this.add(this.lod);
    }

    private _useNominal3: undefined;
    // the higher detail ones are later
    get edges() { return this.lod.children[this.lod.children.length - 1].children[0] as CurveGroup<CurveEdge> }
    get faces() { return this.lod.children[this.lod.children.length - 1].children[1] as FaceGroup }

    get picker() {
        const lod = this.lod.children[this.lod.children.length - 1];
        // FIXME: use this.lod.getCurrentLevel -- currently returns wrong value
        const edges = lod.children[0] as CurveGroup<CurveEdge>;
        const faces = lod.children[1] as FaceGroup;

        const facePicker = faces.mesh.clone();
        facePicker.material = vertexColorMaterial;

        const edgePicker = edges.line.clone();
        // @ts-expect-error
        edgePicker.material = vertexColorLineMaterial;
        vertexColorLineMaterial.uniforms.resolution.value.copy(edges.line.material.resolution)
        edgePicker.material.needsUpdate = true;

        const group = new THREE.Group();
        group.add(facePicker, edgePicker);
        // group.add(edgePicker);
        return group;
    }

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
    get picker() { return this.underlying.picker }
    dispose() { this.underlying.dispose() }
}

export class PlaneInstance<T extends PlaneItem> extends Item {
    private _useNominal3: undefined;
    get underlying() { return this.children[0] as T }
    get picker() { return this.underlying.picker }
    dispose() { this.underlying.dispose() }
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
        this.points.clear();
    }

    get isFragment(): boolean {
        return !!this.userData.untrimmedAncestor;
    }

    get picker() {
        const picker = this.line.clone();
        // FIXME: gc material
        picker.material = new LineMaterial({ color: this.parentItem.simpleName, blending: THREE.NoBlending });
        return picker;
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

    get picker() {
        const picker = this.mesh.clone();
        // FIXME: cache and dispose();
        picker.material = new IdMaterial(this.simpleName);
        return picker;
    }

    get simpleName() { return this.parentItem.simpleName }

    dispose() { this.mesh.geometry.dispose() }
}

export class Region extends PlaneItem {
    get child() { return this.mesh };

    get parentItem(): PlaneInstance<Region> {
        const result = this.parent as PlaneInstance<Region>;
        if (!(result instanceof PlaneInstance)) throw new Error("Invalid precondition");
        return result;
    }

    constructor(private readonly mesh: THREE.Mesh) {
        super()
        this.add(mesh);
    }

    get picker() {
        const picker = this.mesh.clone();
        // FIXME: cache and dispose();
        picker.material = new IdMaterial(this.simpleName);
        return picker;
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

    // FIXME: this is to be removed
    makeView() {
        const edgeGroup = this.parent as CurveGroup<CurveSegment>;
        const original = (edgeGroup.mesh.children[0] as LineSegments2).geometry;
        const instanceStart = original.attributes.instanceStart as THREE.InterleavedBufferAttribute;
        const array = instanceStart.data.array as Float32Array;
        const slice = new Float32Array(array, this.group.start, this.group.count);
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(slice);
        const line = new LineSegments2(geometry);
        line.computeLineDistances();
        return line;
    }

    dispose() { }
}
export class Vertex {
    static build(edge: c3d.EdgeBuffer, material: LineMaterial) {
    }
}

export type GeometryGroup = { start: number; count: number; materialIndex?: number | undefined };

export class Face extends TopologyItem {
    static simpleName(parentId: c3d.SimpleName, index: number) {
        return `face,${parentId},${index}`;
    }

    constructor(readonly group: Readonly<GeometryGroup>, userData: any) {
        super();
        this.userData = userData;
    }

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

    constructor(readonly mesh: THREE.Group, readonly edges: ReadonlyArray<T>) {
        super();
        this.add(mesh);
        if (edges.length > 0) this.add(...edges);
    }

    *[Symbol.iterator]() {
        for (const edge of this.edges) yield edge as T;
    }

    get(i: number): T {
        return this.edges[i];
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

    constructor(readonly mesh: THREE.Mesh, readonly faces: ReadonlyArray<Face>) {
        super();
        this.add(mesh);
        this.add(...faces);
    }

    *[Symbol.iterator]() {
        for (const face of this.faces) yield face;
    }

    get(i: number): Face {
        return this.faces[i];
    }

    dispose() {
        for (const face of this.faces) face.dispose();
        this.mesh.geometry.dispose();
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
                const infos = computeControlPointInfo(contour);
                for (const info of infos) points.push(point2point(info.origin));
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
            positions[i * 3 + 0] = deunit(p.x);
            positions[i * 3 + 1] = deunit(p.y);
            positions[i * 3 + 2] = deunit(p.z);
            colors[i * 3 + 0] = 0.1;
            colors[i * 3 + 1] = 0.1;
            colors[i * 3 + 2] = 0.1;
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
        const result = this.parent?.parent;
        if (!(result instanceof SpaceInstance)) throw new Error("Invalid precondition");
        return result;
    }

    findByIndex(i: number): ControlPoint {
        if (i >= this.length) throw new Error("invalid precondition");
        const result = new ControlPoint(
            this.parentItem,
            this,
            i,
            `${this.parentId},${i}`
        );
        const position = this.geometry!.getAttribute('position') as THREE.BufferAttribute;
        result.position.set(position.getX(i), position.getY(i), position.getZ(i));
        return result;
    }

    *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i++) {
            yield this.findByIndex(i) as ControlPoint;
        }
    }

    get parentId(): number { return this.userData.parentId }
    get geometry() { return this.points?.geometry }

    dispose() {
        this.points?.geometry.dispose();
    }
}

/**
 * Finally, we have some builder functions to enforce type-safety when building the object graph.
 */

export class SolidBuilder {
    private readonly solid = new Solid();

    add(edges: CurveEdgeGroupBuilder, faces: FaceGroupBuilder, distance?: number) {
        const level = new THREE.Group();
        level.add(edges.build());
        level.add(faces.build());
        this.solid.lod.addLevel(level, distance);
    }

    build(): Solid {
        return this.solid;
    }
}

export class SpaceInstanceBuilder<T extends SpaceItem> {
    private readonly instance = new SpaceInstance<T>();

    add(t: T, distance?: number) { this.instance.add(t) }
    build(): SpaceInstance<T> { return this.instance }
}

export class PlaneInstanceBuilder<T extends PlaneItem> {
    private readonly instance = new PlaneInstance<T>();

    add(grid: c3d.MeshBuffer, material: THREE.Material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));

        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(0.01);
        const region = new Region(mesh);
        region.renderOrder = RenderOrder.Face;
        this.instance.add(region);
    }

    build() { return this.instance }
}

export class FaceGroupBuilder {
    private readonly meshes: THREE.Mesh[] = [];
    private parentId!: c3d.SimpleName;

    add(grid: c3d.MeshBuffer, parentId: c3d.SimpleName, material: THREE.Material) {
        this.parentId = parentId;
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(0.01);
        const userData = {
            name: grid.name,
            simpleName: Face.simpleName(parentId, grid.i),
            index: grid.i,
        }
        geometry.userData = userData;

        this.meshes.push(mesh);
    }

    build(): FaceGroup {
        const geos = [];
        const meshes = this.meshes;
        for (const mesh of meshes) geos.push(mesh.geometry);
        const merged = VertexColorMaterial.mergeBufferGeometries(geos, id => GeometryGPUPickingAdapter.encoder.encode('face', this.parentId, id));
        const groups = merged.groups;

        const materials = meshes.map(mesh => mesh.material as THREE.Material);
        const mesh = new THREE.Mesh(merged, materials[0]);

        const faces = [];
        for (const [i, group] of groups.entries()) {
            const face = new Face(group, merged.userData.mergedUserData[i]);
            faces.push(face);
        }

        mesh.scale.setScalar(deunit(1));
        mesh.renderOrder = RenderOrder.Face;

        for (const geo of geos) geo.dispose();
        merged.clearGroups();

        return new FaceGroup(mesh, faces);
    }
}

export type LineInfo = {
    position: Float32Array;
    userData: any;
    material: LineMaterial;
    occludedMaterial: LineMaterial;
};

abstract class CurveBuilder<T extends CurveEdge | CurveSegment> {
    private readonly lines: LineInfo[] = [];
    private parentId!: c3d.SimpleName;

    add(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial) {
        this.parentId = parentId;
        const position = edge.position;
        const userData = {
            name: edge.name,
            simpleName: CurveEdge.simpleName(parentId, edge.i),
            index: edge.i
        }

        this.lines.push({ position, userData, material, occludedMaterial });
    }

    build() {
        let { lines } = this;
        if (lines.length === 0) {
            const group = new THREE.Group();
            // FIXME: ensure gc
            const line = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial())
            const occluded = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial());
            group.add(line, occluded);
            return new CurveGroup(group, []);
        }

        const geometry = LineVertexColorMaterial.mergePositions(lines, id => GeometryGPUPickingAdapter.encoder.encode('edge', this.parentId, id));
        const line = new LineSegments2(geometry, lines[0].material);
        line.scale.setScalar(deunit(1));

        const occluded = new LineSegments2(geometry, lines[0].occludedMaterial);
        occluded.renderOrder = line.renderOrder = RenderOrder.CurveEdge;
        occluded.layers.set(Layers.XRay);
        occluded.scale.setScalar(deunit(1));
        occluded.computeLineDistances();

        const mesh = new THREE.Group();
        mesh.add(line, occluded);

        const edges: T[] = [];
        for (const [i, { userData }] of lines.entries()) {
            const edge = new this.make(geometry.userData.groups[i], userData);
            edges.push(edge);
        }

        return new CurveGroup<T>(mesh, edges);
    }

    protected abstract get make(): GConstructor<T>;
}

export class CurveEdgeGroupBuilder extends CurveBuilder<CurveEdge> {
    get make() { return CurveEdge }
}

export class CurveSegmentGroupBuilder extends CurveBuilder<CurveSegment> {
    // FIXME: probably don't build colors for curve segments
    get make() { return CurveSegment }
}

export class Curve3DBuilder {
    private segments!: CurveGroup<CurveSegment>;
    private points!: ControlPointGroup;

    addSegments(segments: CurveGroup<CurveSegment>) { this.segments = segments }
    addControlPoints(points: ControlPointGroup) { this.points = points }

    build(): Curve3D {
        return new Curve3D(this.segments, this.points!);
    }
}

export const RenderOrder = {
    CurveEdge: 20,
    Face: 10,
    CurveSegment: 20,
    SnapPoints: 30,
    SnapLines: 40,
    SnapNearbyIndicator: 40
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
