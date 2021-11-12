import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { Model as PointPicker } from "../../../commands/PointPicker";
import { DatabaseLike } from "../../../editor/GeometryDatabase";
import * as intersectable from "../../../editor/Intersectable";
import { AxisSnap, ConstructionPlaneSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PlaneSnap, PointSnap, Snap } from "../../../editor/snaps/Snap";
import { SnapManager, SnapResult } from "../../../editor/snaps/SnapManager";
import * as visual from "../../../editor/VisualModel";
import { inst2curve } from "../../../util/Conversion";
import { Viewport } from "../Viewport";
import { GeometryGPUPickingAdapter, GPUPickingAdapter } from "./GeometryGPUPickingAdapter";
import { IdMaterial, LineVertexColorMaterial, PointsVertexColorMaterial, vertexColorLineMaterial } from "./GPUPickingMaterial";

export class SnapIdEncoder {
    encode(type: 'manager' | 'point-picker', index: number) {
        index++; // NOTE: use 1-based indexing, since 0 is the clear color
        return type == 'manager' ? index : (index | (1 << 15));
    }
    decode(data: number): ['manager' | 'point-picker', number] | undefined {
        if (data === 0) return undefined;
        return data >> 15 === 0 ? ['manager', data - 1] : ['point-picker', (data & ~(1 << 15)) - 1]
    }
}

export class DebugSnapIdEncoder extends SnapIdEncoder {
    encode(type: 'manager' | 'point-picker', index: number) {
        index |= 0xf0000000; // NOTE: don't need to increment because always nonzero
        return type == 'manager' ? index : (index | 0x8000);
    }
    decode(data: number): ['manager' | 'point-picker', number] | undefined {
        data &= 0x0fffffff;
        return data >> 15 === 0 ? ['manager', data] : ['point-picker', (data & 0xffff7fff)]
    }
}

export class SnapGPUPickingAdapter implements GPUPickingAdapter<SnapResult> {
    private managerSnaps: Snap[] = [];
    private pointPickerSnaps: Snap[] = [];
    private pickers: THREE.Object3D[] = [];

    static encoder = process.env.NODE_ENV == 'development' ? new DebugSnapIdEncoder() : new SnapIdEncoder();

    constructor(private readonly viewport: Viewport, private readonly snaps: SnapManager, private readonly pointPicker: PointPicker, private readonly db: DatabaseLike) {
        this.update();
    }

    private readonly normalizedScreenPoint = new THREE.Vector2();
    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.normalizedScreenPoint.copy(normalizedScreenPoint);
        this.viewport.picker.setFromCamera(normalizedScreenPoint, camera);
        this.raycaster.setFromCamera(normalizedScreenPoint, camera);
        this.raycaster.layers.enableAll();
    }

    private readonly raycaster = new THREE.Raycaster();
    intersect(): SnapResult[] {
        const intersection = this.viewport.picker.intersect();
        let snap, approximatePosition;
        if (intersection === undefined) {
            const constructionPlane = this.pointPicker.actualConstructionPlaneGiven(this.viewport.constructionPlane, this.viewport.isOrtho);
            this.raycaster.setFromCamera(this.normalizedScreenPoint, this.viewport.camera);
            const intersections = this.raycaster.intersectObject(constructionPlane.snapper);
            if (intersections.length === 0) throw new Error("Invalid condition: should always be able to intersect with construction plane");
            approximatePosition = intersections[0].point;
            snap = constructionPlane;
        } else {
            const { id, position: pos } = intersection;
            approximatePosition = pos;
            if (GeometryGPUPickingAdapter.encoder.parentIdMask & id) {
                const intersectable = GeometryGPUPickingAdapter.get(id, this.db);
                snap = this.intersectable2snap(intersectable);
            } else {
                const [type, index] = SnapGPUPickingAdapter.encoder.decode(id)!;
                snap = (type == 'manager') ? this.managerSnaps[index] : this.pointPickerSnaps[index];
            }
        }
        const { position: precisePosition, orientation } = snap.project(approximatePosition);
        return [{ snap, position: precisePosition, orientation }];
    }

    private intersectable2snap(intersectable: intersectable.Intersectable): Snap {
        if (intersectable instanceof visual.Face) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.SpaceInstance) {
            const model = this.db.lookup(intersectable);
            return new CurveSnap(intersectable, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target");
        }
    }

    private update() {
        const { pointPicker } = this;
        this.pickers = [];
        const restrictions = pointPicker.restrictionSnaps;
        if (restrictions.length > 0) {
            const pickers = this.makePickers(restrictions, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
            this.pickers.push(...pickers);
        } else {
            this.manager();
            this.model();
            this.pickers.push(...this.db.visibleObjects.map(o => o.picker));
        }
        this.viewport.picker.update(this.pickers);
    }

    // FIXME: only run when the scene graph changes; thus need a persistent cache object
    manager() {
        const { snaps } = this;
        this.managerSnaps = snaps.all;
        const pickers = this.makePickers(this.managerSnaps, i => SnapGPUPickingAdapter.encoder.encode('manager', i));
        this.pickers.push(...pickers);
    }

    model() {
        const { pointPicker } = this;
        const additional = pointPicker.snaps;
        this.pointPickerSnaps = additional;
        const pickers = this.makePickers(this.pointPickerSnaps, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
        this.pickers.push(...pickers);
    }

    private makePickers(snaps: Snap[], name: (index: number) => number) {
        const points: [number, THREE.Vector3][] = [];
        const axes: { position: Float32Array; userData: { index: number; }; }[] = [];
        const planes: THREE.Mesh[] = [];
        const p = new THREE.Vector3;
        for (const [i, snap] of snaps.entries()) {
            const id = name(i);
            if (snap instanceof PointSnap) {
                points.push([id, snap.position]);
            } else if (snap instanceof AxisSnap) {
                p.copy(snap.o).add(snap.n).multiplyScalar(100);
                const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
                axes.push({ position, userData: { index: id } });
            } else if (snap instanceof ConstructionPlaneSnap) {
                const geo = PlaneSnap.geometry;
                // FIXME: dispose of material
                const mesh = new THREE.Mesh(geo, new IdMaterial(id));
                planes.push(mesh);
            } else {
                console.error(snap.constructor.name);
                throw new Error("Invalid snap");
            }
        }
        // FIXME: dispose of geometry
        const pointCloud = PointsVertexColorMaterial.make(points, { size: 25, polygonOffset: true, polygonOffsetFactor: -100, polygonOffsetUnits: -100 });
        const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
        // @ts-expect-error
        const line = new LineSegments2(lineGeometry, vertexColorLineMaterial);

        return [pointCloud, line, ...planes];
    }
}

    // nearby = snaps.nearby(raycaster, model.snaps, restrictions);
    // snappers = snaps.snap(raycaster, model.snapsFor(constructionPlane, isOrtho), model.restrictionSnapsFor(constructionPlane, isOrtho), restrictions, viewport.isXRay);
