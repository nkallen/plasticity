import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2";
import { EditorSignals } from "../../../editor/EditorSignals";
import { DatabaseLike } from "../../../editor/GeometryDatabase";
import * as intersectable from "../../../editor/Intersectable";
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PointSnap, Snap } from "../../../editor/snaps/Snap";
import { SnapManager, SnapResult } from "../../../editor/snaps/SnapManager";
import * as visual from "../../../editor/VisualModel";
import { inst2curve } from "../../../util/Conversion";
import { PointsVertexColorMaterial, LineVertexColorMaterial, vertexColorLineMaterial } from "./GPUPickingMaterial";
import { GPUPicker } from "./GPUPicking";

interface GPUPickingAdapter<T> {
    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera): void;
    intersect(): T[];
}

export class SnapPicker implements GPUPickingAdapter<SnapResult> {
    private all: Snap[] = [];
    private pickers: THREE.Object3D[] = [];

    constructor(private readonly picker: GPUPicker, private readonly snaps: SnapManager, private readonly db: DatabaseLike) {
        this.refresh();
        this.picker.update(this.pickers);
    }

    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.picker.setFromCamera(screenPoint, camera);
    }

    intersect(): SnapResult[] {
        const intersection = this.picker.intersect();
        if (intersection === undefined)
            return [];
        const { id, position } = intersection;

        if (0xffff0000 & id) { // parentId is in the high bits; snaps have 0
            const intersectable = GeometryPicker.get(id, this.db);
            return [{ snap: this.intersectable2snap(intersectable), position, orientation: new THREE.Quaternion }];
        } else {
            return [{ snap: this.all[id], position, orientation: new THREE.Quaternion }];
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

    refresh() {
        this.all = this.snaps.all;
        console.log(this.all);

        const points: [number, THREE.Vector3][] = [];
        const axes: { position: Float32Array; userData: { index: number; }; }[] = [];
        const p = new THREE.Vector3;
        for (const [i, snap] of this.all.entries()) {
            if (snap instanceof PointSnap)
                points.push([i, snap.position]);
            else if (snap instanceof AxisSnap) {
                p.copy(snap.o).add(snap.n).multiplyScalar(100);
                const position = new Float32Array([snap.o.x, snap.o.y, snap.o.z, p.x, p.y, p.z]);
                axes.push({ position, userData: { index: i } });
            } else {
                console.error(snap.constructor.name);
                throw new Error("Invalid snap");
            }
        }
        const pointCloud = PointsVertexColorMaterial.make(points);
        const lineGeometry = LineVertexColorMaterial.mergePositions(axes, id => id);
        // @ts-expect-error
        const line = new LineSegments2(lineGeometry, vertexColorLineMaterial);

        this.pickers = [];
        this.pickers.push(pointCloud);
        this.pickers.push(line, pointCloud);
        this.pickers.push(...this.db.visibleObjects.map(o => o.picker));
    }
}

export class GeometryPicker implements GPUPickingAdapter<intersectable.Intersectable> {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose(); }

    constructor(private readonly picker: GPUPicker, private readonly db: DatabaseLike, signals: EditorSignals) {
        this.update = this.update.bind(this);
        signals.sceneGraphChanged.add(this.update);
        signals.historyChanged.add(this.update);
        signals.commandEnded.add(this.update);
        this.disposable.add(new Disposable(() => {
            signals.sceneGraphChanged.remove(this.update);
            signals.historyChanged.remove(this.update);
            signals.commandEnded.remove(this.update);
        }));
        this.update();
    }

    setFromCamera(screenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.picker.setFromCamera(screenPoint, camera);
    }

    intersect() {
        const intersection = this.picker.intersect();
        if (intersection === undefined)
            return [];
        else
            return [GeometryPicker.get(intersection.id, this.db)];
    }

    static get(id: number, db: DatabaseLike): intersectable.Intersectable {
        const { parentId } = GeometryPicker.extract(id);
        const item = db.lookupItemById(parentId).view;
        if (item instanceof visual.Solid) {
            const simpleName = GeometryPicker.compact2full(id);
            const data = db.lookupTopologyItemById(simpleName);
            return [...data.views][0];
        } else if (item instanceof visual.SpaceInstance) {
            return item.underlying;
        } else if (item instanceof visual.PlaneInstance) {
            return item.underlying;
        } else {
            throw new Error("invalid item");
        }
    }

    update() {
        this.picker.update(this.db.visibleObjects.map(o => o.picker));
    }

    static compactTopologyId(type: 'edge' | 'face', parentId: number, index: number): number {
        if (parentId > (1 << 16)) throw new Error("precondition failure");
        if (index > (1 << 15)) throw new Error("precondition failure");

        parentId <<= 16;
        const c = (type === 'edge' ? 0 : 1) << 7;
        const d = c | ((index >> 8) & 0xef);
        const e = ((index >> 0) & 255);

        const id = parentId | (d << 8) | e;
        return id;
    }

    static extract(compact: number) {
        const parentId = compact >> 16;
        compact &= 0xffff;
        const type = compact >> 15;
        compact &= 0x7fff;
        const index = compact;
        return { parentId, type, index };
    }

    static compact2full(compact: number): string {
        const { parentId, type, index } = this.extract(compact);
        return type === 0 ? visual.CurveEdge.simpleName(parentId, index) : visual.Face.simpleName(parentId, index);
    }
}
