import * as THREE from "three";
import { Viewport } from "../../components/viewport/Viewport";
import { Scene } from "../Scene";
import { GizmoSnapPickerStrategy } from "./GizmoSnapPickerStrategy";
import { PointSnap } from "./PointSnap";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { defaultIntersectParams, defaultNearbyParams, RaycasterParams, SnapPicker, SnapResult } from "./SnapPicker";


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

    nearby(snaps: SnapManagerGeometryCache, scene: Scene): PointSnap[] {
        return this.picker.nearby([], snaps);
    }

    intersect(snaps: SnapManagerGeometryCache, scene: Scene): SnapResult[] {
        return this.picker.intersect([], [], snaps, scene, []);
    }
}
