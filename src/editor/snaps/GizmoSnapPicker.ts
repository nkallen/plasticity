import * as THREE from "three";
import { Viewport } from "../../components/viewport/Viewport";
import { DatabaseLike } from "../DatabaseLike";
import { PointSnap } from "./Snap";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { GizmoSnapPickerStrategy } from "./GizmoSnapPickerStrategy";
import { SnapPicker, RaycasterParams, defaultIntersectParams, defaultNearbyParams, SnapResult } from "./SnapPicker";


export class GizmoSnapPicker {
    private readonly strategy = new GizmoSnapPickerStrategy(this.intersectParams, this.nearbyParams);
    private readonly picker = new SnapPicker(this.raycaster, this.strategy);

    constructor(
        private readonly intersectParams: RaycasterParams = defaultIntersectParams,
        private readonly nearbyParams: THREE.RaycasterParameters = defaultNearbyParams,
        private readonly raycaster = new THREE.Raycaster()
    ) { }

    setFromViewport(e: MouseEvent, viewport: Viewport) {
        this.picker.setFromViewport(e, viewport);
    }

    nearby(snaps: SnapManagerGeometryCache, db: DatabaseLike): PointSnap[] {
        return this.picker.nearby([], snaps);
    }

    intersect(snaps: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        return this.picker.intersect([], [], snaps, db, []);
    }
}
