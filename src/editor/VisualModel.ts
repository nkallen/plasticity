import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import c3d from '../../build/Release/c3d.node';
import { BetterRaycastingPoints } from '../util/BetterRaycastingPoints';
import { computeControlPointInfo, deunit, point2point } from "../util/Conversion";

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
        if (!this.visible) return [];
        return this.faces;
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
}


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

    get geometry() { return this.points.geometry }
}

export type FragmentInfo = { start: number, stop: number, untrimmedAncestor: SpaceInstance<Curve3D> };

export class CurveSegment extends THREE.Object3D {
    static build(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial): CurveSegment {
        const geometry = new LineGeometry();
        geometry.setPositions(edge.position);
        const line = new Line2(geometry, material);
        line.scale.setScalar(0.01);

        const occludedLine = new Line2(geometry, occludedMaterial);
        occludedLine.scale.setScalar(0.01);
        occludedLine.computeLineDistances();
        occludedLine.name = 'occluded';

        const built = new CurveSegment(line, occludedLine, edge.name, edge.simpleName);

        return built;
    }

    private constructor(readonly line: Line2, readonly occludedLine: Line2, name: c3d.Name, simpleName: number) {
        super();
        this.add(line, occludedLine);
        occludedLine.renderOrder = line.renderOrder = RenderOrder.CurveEdge;

        this.userData.name = name;
        this.userData.simpleName = simpleName;
        this.renderOrder = RenderOrder.CurveSegment;
        occludedLine.layers.set(Layers.XRay);
    }

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
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));

        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(0.01);
        const built = new Region(mesh);

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
    static simpleName(parentId: c3d.SimpleName, index: number) {
        return `edge,${parentId},${index}`;
    }

    constructor(readonly group: Readonly<GeometryGroup>, userData: any) {
        super();
        this.userData = userData;
    }

    makeView() {
        const edgeGroup = this.parent as CurveEdgeGroup;
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

type GeometryGroup = { start: number; count: number; materialIndex?: number | undefined };

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

export class CurveEdgeGroup extends THREE.Group {
    private _useNominal: undefined;

    constructor(readonly mesh: THREE.Group, readonly edges: ReadonlyArray<CurveEdge>) {
        super();
        this.add(mesh);
        this.add(...edges);
    }

    *[Symbol.iterator]() {
        for (const edge of this.edges) yield edge;
    }

    get(i: number): CurveEdge {
        return this.edges[i];
    }

    dispose() {
        for (const edge of this.edges) edge.dispose();
        for (const child of this.mesh.children) {
            if (!(child instanceof LineSegments2)) throw new Error("invalid precondition");
            child.geometry.dispose();
        }
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
        const result = this.parent?.parent?.parent;
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
        console.log(this.solid);
        return this.solid;
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
    private readonly meshes: THREE.Mesh[] = [];

    add(grid: c3d.MeshBuffer, parentId: c3d.SimpleName, material: THREE.Material) {
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
        const merged = BufferGeometryUtils.mergeBufferGeometries(geos, true);
        for (const mesh of meshes) geos.push(mesh.geometry.dispose());

        const materials = meshes.map(mesh => mesh.material as THREE.Material);
        const mesh = new THREE.Mesh(merged, materials[0]);

        const faces = [];
        for (const [i, group] of mesh.geometry.groups.entries()) {
            const face = new Face(group, mesh.geometry.userData.mergedUserData[i]);
            faces.push(face);
        }

        mesh.geometry.clearGroups();

        mesh.scale.setScalar(deunit(1));
        mesh.renderOrder = RenderOrder.Face;

        return new FaceGroup(mesh, faces);
    }
}

export class CurveEdgeGroupBuilder {
    private readonly lines: { position: Float32Array, userData: any, material: LineMaterial, occludedMaterial: LineMaterial }[] = [];

    add(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial) {
        const position = edge.position;
        const userData = {
            name: edge.name,
            simpleName: CurveEdge.simpleName(parentId, edge.i),
            index: edge.i
        }

        this.lines.push({ position, userData, material, occludedMaterial });
    }

    build() {
        const { lines } = this;
        const groups: GeometryGroup[] = [];

        let arrayLength = 0;
        for (const { position } of lines) {
            arrayLength += (position.length - 3) * 2;
        }
        const array = new Float32Array(arrayLength);
        let offset = 0;
        for (const [i, { position }] of lines.entries()) {
            // converts [ x1, y1, z1,  x2, y2, z2, ... ] to pairs format
            for (let i = 0; i < position.length; i += 3) {
                array[offset + 2 * i] = position[i];
                array[offset + 2 * i + 1] = position[i + 1];
                array[offset + 2 * i + 2] = position[i + 2];
                array[offset + 2 * i + 3] = position[i + 3];
                array[offset + 2 * i + 4] = position[i + 4];
                array[offset + 2 * i + 5] = position[i + 5];
            }
            const length = (position.length - 3) * 2;
            groups.push({ start: offset, count: length, materialIndex: i })
            offset += length;
        }
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(array);
        const line = new LineSegments2(geometry, lines[0].material);
        line.scale.setScalar(deunit(1));
        const occluded = new LineSegments2(geometry, lines[0].occludedMaterial);
        occluded.renderOrder = line.renderOrder = RenderOrder.CurveEdge;
        occluded.layers.set(Layers.XRay);
        occluded.scale.setScalar(deunit(1));
        occluded.computeLineDistances();

        const mesh = new THREE.Group();
        mesh.add(line, occluded);

        const edges = [];
        for (const [i, { userData, material, occludedMaterial }] of lines.entries()) {
            const edge = new CurveEdge(groups[i], userData);
            edges.push(edge);
        }

        return new CurveEdgeGroup(mesh, edges);
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
        return new Curve3D(this.segments, this.points!);
    }
}

const RenderOrder = {
    CurveEdge: 11,
    Face: 10,
    CurveSegment: 10,
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
