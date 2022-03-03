import * as THREE from "three";
import * as intersectable from "../../visual_model/Intersectable";
import { BetterRaycastingPoints, BetterRaycastingPointsMaterial } from "../../visual_model/VisualModelRaycasting";
import { DatabaseLike } from "../DatabaseLike";
import { PointSnap, Snap } from "../snaps/Snap";
import { SnapManager } from "../snaps/SnapManager";

export class SnapManagerGeometryCache {
    get resolution() { return this._geometrySnaps.resolution; }

    get enabled() { return this.snaps.enabled }

    constructor(private readonly snaps: SnapManager, private readonly db: DatabaseLike) {
        this.update();
    }

    private _basic: THREE.Object3D[] = [];
    get basic() { return this._basic }

    get layers() { return this.snaps.layers }

    private _geometrySnaps!: PointSnapCache;
    get geometrySnaps() { return this._geometrySnaps }
    
    update() {
        const { basicSnaps, geometrySnaps, crossSnaps } = this.snaps.all;
        const result = [];
        const geometrySnapCache = new PointSnapCache();
        this._geometrySnaps = geometrySnapCache;

        for (const points of geometrySnaps) {
            geometrySnapCache.add(points);
        }
        for (const snap of basicSnaps) {
            if (snap instanceof PointSnap) {
                geometrySnapCache.add(new Set([snap]));
                continue;
            }
            result.push(snap.snapper);
        }
        geometrySnapCache.add(new Set(crossSnaps));
        this._basic = result;
    }

    lookup(intersectable: intersectable.Intersectable): Snap {
        return this.snaps.identityMap.lookup(intersectable);
    }
}

export class PointSnapCache {
    private readonly material = new BetterRaycastingPointsMaterial();
    get resolution() { return this.material.resolution; }

    private _points: Set<BetterRaycastingPoints> = new Set();
    get points() { return this._points; }

    add(points: ReadonlySet<PointSnap>) {
        const pointInfo = new Float32Array(points.size * 3);
        let j = 0;
        const array = [...points];
        for (const point of points) {
            pointInfo.set(point.position.toArray(), j * 3);
            j++;
        }
        const pointsGeometry = new THREE.BufferGeometry();
        pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointInfo, 3));
        const picker = new BetterRaycastingPoints(pointsGeometry, this.material);
        picker.userData.points = array;
        this._points.add(picker);
    }

    clear() {
        this._points.clear();
    }
}
