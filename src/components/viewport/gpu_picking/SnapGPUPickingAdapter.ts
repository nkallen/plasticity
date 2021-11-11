import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { Model as PointPicker } from "../../../commands/PointPicker";
import { DatabaseLike } from "../../../editor/GeometryDatabase";
import * as intersectable from "../../../editor/Intersectable";
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PlaneSnap, PointSnap, Snap } from "../../../editor/snaps/Snap";
import { SnapManager, SnapResult } from "../../../editor/snaps/SnapManager";
import * as visual from "../../../editor/VisualModel";
import { inst2curve } from "../../../util/Conversion";
import { Viewport } from "../Viewport";
import { GeometryGPUPickingAdapter, GPUPickingAdapter } from "./GeometryGPUPickingAdapter";
import { IdMaterial, LineVertexColorMaterial, PointsVertexColorMaterial, vertexColorLineMaterial } from "./GPUPickingMaterial";

export class SnapIdEncoder {
    encode(type: 'manager' | 'point-picker', index: number) {
        index++;
        return type == 'manager' ? index : (index | 0x8000);
    }

    decode(data: number): ['manager' | 'point-picker', number] {
        return data >> 15 === 0 ? ['manager', data - 1] : ['point-picker', (data & 0xffff7fff) - 1]
    }
}

export class DebugSnapIdEncoder extends SnapIdEncoder {
    encode(type: 'manager' | 'point-picker', index: number) {
        index |= 0xf0000000;
        return type == 'manager' ? index : (index | 0x8000);
    }
    decode(data: number): ['manager' | 'point-picker', number] {
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
        this.pickers = [];
        this.manager();
        this.model();
        this.pickers.push(...this.db.visibleObjects.map(o => o.picker));
        this.viewport.picker.update(this.pickers);
    }

    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.viewport.picker.setFromCamera(normalizedScreenPoint, camera);
    }

    intersect(): SnapResult[] {
        const intersection = this.viewport.picker.intersect();
        if (intersection === undefined) return [];
        const { id, position } = intersection;

        if (GeometryGPUPickingAdapter.encoder.parentIdMask & id) {
            const intersectable = GeometryGPUPickingAdapter.get(id, this.db);
            return [{ snap: this.intersectable2snap(intersectable), position, orientation: new THREE.Quaternion }];
        } else {
            const [type, index] = SnapGPUPickingAdapter.encoder.decode(id);
            if (type == 'manager')
                return [{ snap: this.managerSnaps[index - 1], position, orientation: new THREE.Quaternion }];
            else
                return [{ snap: this.pointPickerSnaps[index - 1], position, orientation: new THREE.Quaternion }];
        }
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

    // FIXME only run when the scene graph changes; thus need a persistent cache object
    manager() {
        const { snaps } = this;
        this.managerSnaps = snaps.all;

        const pickers = this.makePickers(this.managerSnaps, i => SnapGPUPickingAdapter.encoder.encode('manager', i));
        this.pickers.push(...pickers);
    }

    model() {
        const { viewport: { constructionPlane, isOrtho }, pointPicker, snaps } = this;

        const additional = pointPicker.snapsFor(constructionPlane, isOrtho);
        const restrictionSnaps = pointPicker.restrictionSnapsFor(constructionPlane, isOrtho);

        this.pointPickerSnaps = restrictionSnaps;

        const pickers = this.makePickers(this.pointPickerSnaps, i => SnapGPUPickingAdapter.encoder.encode('point-picker', i));
        this.pickers.push(...pickers);
    }

    private makePickers(snaps: Snap[], name: (index: number) => number) {
        const points: [number, THREE.Vector3][] = [];
        const axes: { position: Float32Array; userData: { index: number; }; }[] = [];
        const planes: THREE.Mesh[] = [];
        const p = new THREE.Vector3;
        for (const [i, snap] of snaps.entries()) {
            const id = name(i + 1);
            if (snap instanceof PointSnap) {
                points.push([id, snap.position]);
            } else if (snap instanceof AxisSnap) {
                p.copy(snap.o).add(snap.n).multiplyScalar(100);
                const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
                axes.push({ position, userData: { index: id } });
            } else if (snap instanceof PlaneSnap) {
                const geo = PlaneSnap.geometry;
                // FIXME dispose of material
                const mesh = new THREE.Mesh(geo, new IdMaterial(id))
                planes.push(mesh);
            } else {
                console.error(snap.constructor.name);
                throw new Error("Invalid snap");
            }
        }
        // FIXME dispose of geometry
        const pointCloud = PointsVertexColorMaterial.make(points);
        const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
        // @ts-expect-error
        const line = new LineSegments2(lineGeometry, vertexColorLineMaterial);

        return [pointCloud, line, ...planes];
    }
}

// class PointPickerQuery {
//     constructor(private readonly pointPicker: PointPicker, private readonly snaps: SnapManager, private readonly viewport: Viewport) {

//     }
//     // nearby = snaps.nearby(raycaster, model.snaps, restrictions);
//     // snappers = snaps.snap(raycaster, model.snapsFor(constructionPlane, isOrtho), model.restrictionSnapsFor(constructionPlane, isOrtho), restrictions, viewport.isXRay);

//     snap() {
//         const { viewport: { constructionPlane, isOrtho }, pointPicker, snaps } = this;

//         const additional = pointPicker.snapsFor(constructionPlane, isOrtho);
//         const restrictionSnaps = pointPicker.restrictionSnapsFor(constructionPlane, isOrtho);
//         // const restrictions = pointPicker.restrictionsFor(constructionPlane, isOrtho);

//         return [...additional, ...restrictionSnaps];
//     }
// }