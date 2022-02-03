import * as THREE from "three";
import { CurveEdgeSnap, CurveSnap, FaceSnap, PointSnap, Snap } from "../editor/snaps/Snap";
import { SnapManager } from "../editor/snaps/SnapManager";
import { BetterRaycastingPoints, BetterRaycastingPointsMaterial } from "./VisualModelRaycasting";
import * as intersectable from "./Intersectable";
import * as visual from "./VisualModel";
import { inst2curve } from "../util/Conversion";
import { DatabaseLike } from "../editor/DatabaseLike";


export class SnapManagerGeometryCache {
    private readonly material = new BetterRaycastingPointsMaterial();
    get resolution() { return this.material.resolution; }

    get enabled() { return this.snaps.enabled; }

    constructor(private readonly snaps: SnapManager, private readonly db: DatabaseLike) {
        this.update();
    }

    private _points: THREE.Points[] = [];
    get points() { return this._points; }

    private _snappers: THREE.Object3D[] = [];
    get snappers() { return this._snappers }

    get layers() { return this.snaps.layers }

    private geometrySnaps: PointSnap[][] = [];
    update() {
        const { basicSnaps, geometrySnaps, crossSnaps } = this.snaps.all;
        const result = [];
        this.geometrySnaps = [];
        this._points = [];

        let i = 0;
        for (const points of geometrySnaps) {
            const pointInfo = new Float32Array(points.size * 3);
            let j = 0;
            for (const point of points) {
                pointInfo.set(point.position.toArray(), j * 3);
                j++;
            }
            const pointsGeometry = new THREE.BufferGeometry();
            pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointInfo, 3));
            const picker = new BetterRaycastingPoints(pointsGeometry, this.material);
            picker.userData.index = i;
            result.push(picker);
            i++;
            this.geometrySnaps.push([...points]);
            this._points.push(picker);
        }
        for (const snap of basicSnaps) result.push(snap.snapper);
        for (const snap of crossSnaps) result.push(snap.snapper);
        this._snappers = result;
    }

    get(points: THREE.Points, index: number) {
        const { geometrySnaps } = this;
        const snaps = geometrySnaps[points.userData.index as number];
        return snaps[index];
    }

    private readonly identityMap = new Map<intersectable.Intersectable, Snap>();
    lookup(intersectable: intersectable.Intersectable): Snap {
        const { identityMap, db } = this;
        if (identityMap.has(intersectable)) return identityMap.get(intersectable)!;

        let result;
        if (intersectable instanceof visual.Face) {
            const model = db.lookupTopologyItem(intersectable);
            result = new FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = db.lookupTopologyItem(intersectable);
            result = new CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.Curve3D) {
            const model = db.lookup(intersectable.parentItem);
            result = new CurveSnap(intersectable.parentItem, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target: " + intersectable.constructor.name);
        }
        identityMap.set(intersectable, result);
        return result;
    }
}
