import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { DatabaseLike } from "../../../editor/GeometryDatabase";
import * as intersectable from "../../../editor/Intersectable";
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PointSnap, Snap } from "../../../editor/snaps/Snap";
import { SnapManager, SnapResult } from "../../../editor/snaps/SnapManager";
import * as visual from "../../../editor/VisualModel";
import { inst2curve } from "../../../util/Conversion";
import { PointsVertexColorMaterial, LineVertexColorMaterial, vertexColorLineMaterial } from "./GPUPickingMaterial";
import { GPUPicker } from "./GPUPicking";
import { GPUPickingAdapter, GeometryGPUPickingAdapter } from "./GeometryGPUPickingAdapter";

class SnapIdEncoder {
    encode(index: number) { return index }
    decode(data: number) { return data }
}

class DebugSnapIdEncoder extends SnapIdEncoder {
    encode(index: number) { return index | 0xf0000000 }
    decode(data: number) { return data & 0x0fffffff }
}

export class SnapGPUPickingAdapter implements GPUPickingAdapter<SnapResult> {
    private all: Snap[] = [];
    private pickers: THREE.Object3D[] = [];

    static encoder = process.env.NODE_ENV == 'development' ? new DebugSnapIdEncoder() : new SnapIdEncoder();

    constructor(private readonly picker: GPUPicker, private readonly snaps: SnapManager, private readonly db: DatabaseLike) {
        this.refresh();
        this.picker.update(this.pickers);
    }

    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.picker.setFromCamera(normalizedScreenPoint, camera);
    }

    intersect(): SnapResult[] {
        const intersection = this.picker.intersect();
        if (intersection === undefined)
            return [];
        const { id, position } = intersection;

        if (GeometryGPUPickingAdapter.encoder.parentIdMask & id) {
            const intersectable = GeometryGPUPickingAdapter.get(id, this.db);
            return [{ snap: this.intersectable2snap(intersectable), position, orientation: new THREE.Quaternion }];
        } else {
            return [{ snap: this.all[SnapGPUPickingAdapter.encoder.decode(id)], position, orientation: new THREE.Quaternion }];
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
    refresh() {
        this.all = this.snaps.all;

        console.log(this.all);

        const points: [number, THREE.Vector3][] = [];
        const axes: { position: Float32Array; userData: { index: number; }; }[] = [];
        const p = new THREE.Vector3;
        for (const [i, snap] of this.all.entries()) {
            const id = SnapGPUPickingAdapter.encoder.encode(i);
            if (snap instanceof PointSnap)
                points.push([id, snap.position]);
            else if (snap instanceof AxisSnap) {
                p.copy(snap.o).add(snap.n).multiplyScalar(100);
                const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
                axes.push({ position, userData: { index: id } });
            } else {
                console.error(snap.constructor.name);
                throw new Error("Invalid snap");
            }
        }
        const pointCloud = PointsVertexColorMaterial.make(points);
        const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
        // FIXME try using a plain mesh
        // @ts-expect-error
        const line = new LineSegments2(lineGeometry, vertexColorLineMaterial);

        this.pickers = [];
        this.pickers.push(pointCloud);
        this.pickers.push(line, pointCloud);
        this.pickers.push(...this.db.visibleObjects.map(o => o.picker));
    }
}
