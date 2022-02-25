import * as THREE from "three";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry";
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import c3d from '../../build/Release/c3d.node';
import { GeometryDatabase } from "../editor/GeometryDatabase";
import { computeControlPointInfo, deunit, point2point } from "../util/Conversion";
import { GConstructor } from "../util/Util";
import { ControlPoint, ControlPointGroup, Curve3D, CurveEdge, CurveGroup, CurveSegment, Face, FaceGroup, GeometryGroup, Layers, PlaneInstance, PlaneItem, Region, RenderOrder, Solid, SolidLevel, SpaceInstance, SpaceItem } from "./VisualModel";
import { BetterRaycastingPoints, BetterRaycastingPointsMaterial } from "./VisualModelRaycasting";

export interface Builder<T> {
    build(simpleName: c3d.SimpleName, topologyModel?: GeometryDatabase['topologyModel'], controlPointModel?: GeometryDatabase['controlPointModel']): T
}

export class SolidBuilder implements Builder<Solid> {
    private readonly levels: [CurveEdgeGroupBuilder, FaceGroupBuilder, number?][] = [];

    add(edges: CurveEdgeGroupBuilder, faces: FaceGroupBuilder, distance?: number) {
        this.levels.push([edges, faces, distance]);
    }

    build(simpleName: c3d.SimpleName, topologyModel?: GeometryDatabase['topologyModel'], controlPointModel?: GeometryDatabase['controlPointModel']): Solid {
        const solid = new Solid();
        for (const [edges, faces, distance] of this.levels) {
            const level = new SolidLevel(edges.build(topologyModel), faces.build(topologyModel));
            solid.lod.addLevel(level, distance);
        }
        solid.userData.simpleName = simpleName
        return solid;
    }
}

export class SpaceInstanceBuilder<T extends SpaceItem> implements Builder<SpaceInstance<T>> {
    private readonly instance = new SpaceInstance<T>();

    add(t: T, distance?: number) { this.instance.add(t); }

    build(simpleName: c3d.SimpleName, topologyModel?: GeometryDatabase['topologyModel'], controlPointModel?: GeometryDatabase['controlPointModel']): SpaceInstance<T> {
        const { instance, instance: { underlying } } = this;
        instance.userData.simpleName = simpleName; // NOTE: this is necessary because point.simpleName relies on the parent having been set.
        if (controlPointModel !== undefined && underlying instanceof Curve3D) {
            for (const point of underlying.points) {
                const simpleName = point.simpleName;
                let data = controlPointModel.get(simpleName);
                let views;
                if (data === undefined) {
                    views = new Set<ControlPoint>();
                    data = { index: point.index, views: views }
                    controlPointModel.set(simpleName, data);
                } else {
                    views = data.views;
                }
                views.add(point);
            }
        }
        return instance;
    }
}

export class PlaneInstanceBuilder<T extends PlaneItem> implements Builder<PlaneInstance<T>> {
    private readonly instance = new PlaneInstance<T>();

    add(grid: c3d.MeshBuffer, material: THREE.Material) {
        const geometry = new THREE.BufferGeometry();
        geometry.setIndex(new THREE.BufferAttribute(grid.index, 1));
        geometry.setAttribute('position', new THREE.BufferAttribute(grid.position, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(grid.normal, 3));

        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.setScalar(deunit(1));
        const region = new Region(mesh);
        region.renderOrder = RenderOrder.Face;
        this.instance.add(region);
    }

    build(simpleName: c3d.SimpleName, topologyModel?: GeometryDatabase['topologyModel'], controlPointModel?: GeometryDatabase['controlPointModel']) {
        return this.instance;
    }
}

export class FaceGroupBuilder {
    private readonly grids: c3d.MeshBuffer[] = [];
    private readonly materials: THREE.Material[] = [];
    private readonly userDatas: { simpleName: string, index: number, }[] = [];

    add(grid: c3d.MeshBuffer, parentId: c3d.SimpleName, material: THREE.Material) {
        this.grids.push(grid);
        this.materials.push(material);
        const userData = {
            simpleName: Face.simpleName(parentId, grid.i),
            index: grid.i,
        };

        this.userDatas.push(userData);
    }

    build(topologyModel?: GeometryDatabase['topologyModel']): FaceGroup {
        const { grids, materials, userDatas } = this;
        const merged = mergeBufferGeometries(grids);
        const groups = merged.groups;

        const mesh = new THREE.Mesh(merged, materials[0]);
        mesh.layers.set(Layers.Face);

        const faces = [];
        for (const [i, group] of groups.entries()) {
            const grid = grids[i];
            const userData = userDatas[i];

            const model = grid.model;
            const face = new Face(group, grid.grid, userData);
            faces.push(face);

            if (topologyModel !== undefined) {
                const simpleName = userData.simpleName;
                let topologyData = topologyModel.get(simpleName);
                let views;
                if (topologyData === undefined) {
                    views = new Set<Face>();
                    topologyData = { model, views }
                    topologyModel.set(simpleName, topologyData);
                } else {
                    views = topologyData.views;
                }
                views.add(face);
            }
        }

        mesh.scale.setScalar(deunit(1));
        mesh.renderOrder = RenderOrder.Face;

        merged.clearGroups();

        return new FaceGroup(mesh, faces, groups);
    }
}

export type LineInfo = {
    position: Float32Array;
    userData: { simpleName: string, index: number };
    material: LineMaterial;
    occludedMaterial: LineMaterial;
    model: c3d.CurveEdge;
};

abstract class CurveBuilder<T extends CurveEdge | CurveSegment> {
    private readonly lines: LineInfo[] = [];

    add(edge: c3d.EdgeBuffer, parentId: c3d.SimpleName, material: LineMaterial, occludedMaterial: LineMaterial) {
        const position = edge.position;
        const simpleName = CurveEdge.simpleName(parentId, edge.i);
        const userData = {
            simpleName,
            index: edge.i
        };

        if (position.length === 0) return;
        this.lines.push({ position, userData, material, occludedMaterial, model: edge.model });
    }

    build(topologyModel?: GeometryDatabase['topologyModel']) {
        let { lines } = this;
        if (lines.length === 0) {
            const group = new THREE.Group();
            // FIXME: ensure gc
            const line = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial());
            const occluded = new LineSegments2(new LineSegmentsGeometry(), new LineMaterial());
            group.add(line, occluded);
            return new CurveGroup(group, []);
        }

        const { geometry, groups } = CurveBuilder.mergePositions(lines.map(l => l.position));
        const line = new LineSegments2(geometry, lines[0].material);
        line.scale.setScalar(deunit(1));
        line.layers.set(Layers.CurveEdge);

        const occluded = new LineSegments2(geometry, lines[0].occludedMaterial);
        occluded.renderOrder = line.renderOrder = RenderOrder.CurveEdge;
        occluded.layers.set(Layers.CurveEdge_XRay);
        occluded.scale.setScalar(deunit(1));
        occluded.computeLineDistances();

        const mesh = new THREE.Group();
        mesh.add(line, occluded);

        const edges: T[] = [];
        for (const [i, { userData, model }] of lines.entries()) {
            const edge = new this.make(groups[i], userData);
            edges.push(edge);
            if (topologyModel !== undefined && edge instanceof CurveEdge) {
                let topologyData = topologyModel.get(edge.simpleName);
                let views;
                if (topologyData === undefined) {
                    views = new Set<CurveEdge>();
                    topologyData = { model, views }
                    topologyModel.set(edge.simpleName, topologyData);
                } else {
                    views = topologyData.views;
                }
                views.add(edge);
            }
        }

        return new CurveGroup<T>(mesh, edges);
    }

    protected abstract get make(): GConstructor<T>;

    static mergePositions(positions: Float32Array[]) {
        const groups: GeometryGroup[] = [];
        let arrayLength = 0;
        for (const position of positions) {
            arrayLength += (position.length - 3) * 2;
        }
        const array = new Float32Array(arrayLength);
        let offset = 0, i = 0;
        for (const position of positions) {
            const plength = position.length;
            // converts [ x1, y1, z1,  x2, y2, z2, ... ] to pairs format
            for (let j = 0; j < plength; j += 3) {
                const start = offset + 2 * j;
                array[start + 0] = position[j + 0];
                array[start + 1] = position[j + 1];
                array[start + 2] = position[j + 2];
                if (plength < j + 5) continue; // performance optimization for complex models
                array[start + 3] = position[j + 3];
                array[start + 4] = position[j + 4];
                array[start + 5] = position[j + 5];
            }
            const length = (position.length - 3) * 2;
            groups.push({ start: offset, count: length, materialIndex: i++ });
            offset += length;
        }
        const geometry = new LineSegmentsGeometry();
        geometry.setPositions(array);

        return { geometry, array, groups };
    }
}

export class CurveEdgeGroupBuilder extends CurveBuilder<CurveEdge> {
    get make() { return CurveEdge }
}

export class CurveSegmentGroupBuilder extends CurveBuilder<CurveSegment> {
    get make() { return CurveSegment }
}

export class ControlPointGroupBuilder {
    static build(item: c3d.SpaceItem, parentId: c3d.SimpleName, material: BetterRaycastingPointsMaterial): ControlPointGroup {
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
        const better = this.fromCartPoints(points, parentId, material);
        return new ControlPointGroup(points.length, better);
    }

    private static fromCartPoints(ps: c3d.CartPoint3D[], parentId: c3d.SimpleName, material: BetterRaycastingPointsMaterial) {
        const info: THREE.Vector3[] = ps.map(p => point2point(p));
        const geometry = this.geometry(info);
        geometry.setAttribute('color', new THREE.Uint8BufferAttribute(new Uint8Array(ps.length * 3), 3, true))
        const points = new BetterRaycastingPoints(geometry, material);
        points.layers.set(Layers.ControlPoint);
        return points;
    }

    static geometry(points: THREE.Vector3[]) {
        const positions = new Float32Array(points.length * 3);
        for (const [i, point] of points.entries()) {
            const position = point;
            positions[i * 3 + 0] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        return geometry;
    }
}

export function mergeBufferGeometries(grids: c3d.MeshBuffer[]) {
    const indexes = [], positions = [], normals = [];
    for (const { index, position, normal } of grids) {
        // if (index.length === 0) continue;

        indexes.push(index);
        positions.push(position);
        normals.push(normal);
    }

    const mergedGeometry = new THREE.BufferGeometry();
    let offset = 0;
    let indexOffset = 0;
    const mergedIndex: number[] = [];
    for (const [i, index] of indexes.entries()) {
        const count = index.length;

        for (let j = 0; j < count; ++j) {
            mergedIndex.push(index[j] + indexOffset);
        }
        indexOffset += positions[i].length / 3;
        mergedGeometry.addGroup(offset, count, i);

        offset += count;
    }
    mergedGeometry.setIndex(mergedIndex);

    const mergedPositions = mergeBufferAttributes(positions);
    const mergedNormals = mergeBufferAttributes(normals);
    mergedGeometry.setAttribute('position', mergedPositions);
    mergedGeometry.setAttribute('normal', mergedNormals);

    return mergedGeometry;
}

export function mergeBufferAttributes(attributes: Float32Array[]) {
    let arrayLength = 0;
    for (const attribute of attributes) arrayLength += attribute.length;
    const array = new Float32Array(arrayLength);
    let offset = 0;
    for (const attribute of attributes) {
        array.set(attribute, offset);
        offset += attribute.length;
    }

    return new THREE.BufferAttribute(array, 3);
}