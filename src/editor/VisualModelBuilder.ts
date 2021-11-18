import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import c3d from '../../build/Release/c3d.node';
import { GeometryGPUPickingAdapter } from "../components/viewport/gpu_picking/GeometryGPUPickingAdapter";
import { IdPointsMaterial, LineVertexColorMaterial, VertexColorMaterial } from "../components/viewport/gpu_picking/GPUPickingMaterial";
import { computeControlPointInfo, deunit, point2point } from "../util/Conversion";
import { GConstructor } from "../util/Util";
import { CurveEdge, CurveGroup, CurveSegment, Face, FaceGroup, Layers, PlaneInstance, PlaneItem, Region, RenderOrder, Solid, SpaceInstance, SpaceItem } from "./VisualModel";

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

    add(t: T, distance?: number) { this.instance.add(t); }
    build(): SpaceInstance<T> { return this.instance; }
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

    build() { return this.instance; }
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
            grid: grid.grid,
        };
        geometry.userData = userData;

        this.meshes.push(mesh);
    }

    build(): FaceGroup {
        const geos = [];
        const meshes = this.meshes;
        for (const mesh of meshes)
            geos.push(mesh.geometry);
        const merged = VertexColorMaterial.mergeBufferGeometries(geos, id => GeometryGPUPickingAdapter.encoder.encode('face', this.parentId, id));
        const groups = merged.groups;

        const materials = meshes.map(mesh => mesh.material as THREE.Material);
        const mesh = new THREE.Mesh(merged, materials[0]);

        const faces = [];
        for (const [i, group] of groups.entries()) {
            const userData = merged.userData.mergedUserData[i];
            const grid = userData.grid;
            delete userData.grid;
            const face = new Face(group, grid, userData);
            faces.push(face);
        }

        mesh.scale.setScalar(deunit(1));
        mesh.renderOrder = RenderOrder.Face;

        for (const geo of geos)
            geo.dispose();
        merged.clearGroups();

        return new FaceGroup(mesh, faces, groups);
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
        };

        this.lines.push({ position, userData, material, occludedMaterial });
    }

    build() {
        let { lines } = this;
        if (lines.length === 0) {
            const group = new THREE.Group();
            // FIXME: ensure gc
            const line = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial());
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
    get make() { return CurveEdge; }
}

export class CurveSegmentGroupBuilder extends CurveBuilder<CurveSegment> {
    // FIXME: probably don't build colors for curve segments
    get make() { return CurveSegment; }
}

export class ControlPointGroup extends THREE.Group {
    static build(item: c3d.SpaceItem, parentId: c3d.SimpleName, material: THREE.PointsMaterial): THREE.Points {
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

    private static fromCartPoints(ps: c3d.CartPoint3D[], parentId: c3d.SimpleName, material: THREE.PointsMaterial) {
        const info: [number, THREE.Vector3][] = ps.map((p, i) => [GeometryGPUPickingAdapter.encoder.encode('control-point', parentId, i), point2point(p)]);
        const geometry = IdPointsMaterial.geometry(info);
        geometry.setAttribute('color', new THREE.Uint8BufferAttribute(new Uint8Array(ps.length * 3), 3, true))
        const points = new THREE.Points(geometry, material);
        points.layers.set(Layers.ControlPoint);
        return points;
    }
}