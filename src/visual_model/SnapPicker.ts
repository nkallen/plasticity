import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { Model } from "../commands/PointPicker";
import { Viewport } from "../components/viewport/Viewport";
import { DatabaseLike } from "../editor/GeometryDatabase";
import LayerManager from "../editor/LayerManager";
import { AxisSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PointSnap, Snap } from "../editor/snaps/Snap";
import { SnapManager } from "../editor/snaps/SnapManager";
import { inst2curve } from "../util/Conversion";
import * as intersectable from "./Intersectable";
import * as visual from "./VisualModel";
import { BetterRaycastingPoints } from "./VisualModelRaycasting";

export class SnapPicker {
    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 20 },
        Points: { threshold: 10 /*px*/ }
    };

    private readonly raycaster = new THREE.Raycaster();

    constructor(
        private readonly layers: LayerManager,
        private readonly snaps: SnapManagerGeometryCache,
        private readonly viewport: Viewport,
        private readonly db: DatabaseLike
    ) {
        this.raycaster.layers = layers.visible;
        this.raycaster.params = this.raycasterParams;
    }

    setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.raycaster.setFromCamera(normalizedScreenPoint, camera);
    }

    nearby() {
        return [];
    }

    intersect(pointPicker: Model): SnapResult[] {
        const { raycaster, snaps, db, viewport } = this;

        if (!snaps.enabled) return this.intersectConstructionPlane(pointPicker);
        if (pointPicker.choice !== undefined) return this.intersectChoice(pointPicker.choice);

        const restrictions = pointPicker.restrictionSnaps.map(r => r.snapper);
        let intersections: THREE.Intersection[];
        if (restrictions.length > 0) {
            intersections = raycaster.intersectObjects(restrictions);
        } else {
            snaps.resolution.set(viewport.renderer.domElement.offsetWidth, viewport.renderer.domElement.offsetHeight);
            const snappers = snaps.snappers;
            const additional = pointPicker.snaps.map(s => s.snapper);
            const geometry = db.visibleObjects;
            console.time();
            intersections = raycaster.intersectObjects([...snappers, ...additional, ...geometry], false);
            console.timeEnd();
        }

        const result = [];
        for (const intersection of intersections) {
            const object = intersection.object;
            let snap: Snap;
            if (object instanceof visual.TopologyItem || object instanceof visual.Curve3D || object instanceof visual.ControlPoint || object instanceof visual.Region) {
                snap = this.intersectable2snap(object);
            } else if (object instanceof THREE.Points) {
                snap = snaps.get(object, intersection.index!);
            } else {
                snap = object.userData.snap as Snap;
            }
            result.push({ snap: snap, ...snap.project(intersection.point) });
        }
        if (result.length === 0) return this.intersectConstructionPlane(pointPicker);
        else return result;
    }

    private intersectConstructionPlane(pointPicker: Model): SnapResult[] {
        const { viewport, viewport: { isOrtho }, raycaster } = this;

        const constructionPlane = pointPicker.actualConstructionPlaneGiven(viewport.constructionPlane, isOrtho);
        const intersections = raycaster.intersectObject(constructionPlane.snapper);
        if (intersections.length === 0) return [];
        const approximatePosition = intersections[0].point;
        const snap = constructionPlane;
        const { position: precisePosition, orientation } = snap.project(approximatePosition);
        return [{ snap, position: precisePosition, orientation }];
    }

    private intersectChoice(choice: AxisSnap): SnapResult[] {
        const position = choice.intersect(this.raycaster);
        if (position === undefined) return [];
        else return [{ snap: choice!, orientation: choice.orientation, position }];
    }

    private intersectable2snap(intersectable: intersectable.Intersectable): Snap {
        if (intersectable instanceof visual.Face) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = this.db.lookupTopologyItem(intersectable);
            return new CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.Curve3D) {
            const model = this.db.lookup(intersectable.parentItem);
            return new CurveSnap(intersectable.parentItem, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target");
        }
    }
}

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
}

export class SnapManagerGeometryCache {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    readonly resolution = new THREE.Vector2();

    get enabled() { return this.snaps.enabled }

    constructor(private readonly snaps: SnapManager) {
        this.update();
    }

    private geometrySnaps: PointSnap[][] = [];
    private _snappers: THREE.Object3D[] = [];
    private update() {
        const { basicSnaps, geometrySnaps, crossSnaps } = this.snaps.all;
        const result = [];
        this.geometrySnaps = [];
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
            const picker = new BetterRaycastingPoints(pointsGeometry);
            picker.resolution = this.resolution;
            picker.userData.index = i;
            result.push(picker);
            i++;
            this.geometrySnaps.push([...points]);
        }
        for (const snap of basicSnaps) result.push(snap.snapper);
        for (const snap of crossSnaps) result.push(snap.snapper);
        this._snappers = result;
    }

    get snappers() {
        return this._snappers;
    }

    get(points: THREE.Points, index: number) {
        const { geometrySnaps } = this;
        const snaps = geometrySnaps[points.userData.index as number];
        return snaps[index];
    }
}