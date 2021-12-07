import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { Layers } from "three";
import { Model } from "../commands/PointPicker";
import { Viewport } from "../components/viewport/Viewport";
import { DatabaseLike } from "../editor/GeometryDatabase";
import LayerManager from "../editor/LayerManager";
import { AxisSnap, CurveEdgeSnap, CurveEndPointSnap, CurvePointSnap, CurveSnap, FaceCenterPointSnap, FaceSnap, PointSnap, Snap } from "../editor/snaps/Snap";
import { SnapManager } from "../editor/snaps/SnapManager";
import { inst2curve } from "../util/Conversion";
import * as intersectable from "./Intersectable";
import * as visual from "./VisualModel";
import { BetterRaycastingPoints, BetterRaycastingPointsMaterial } from "./VisualModelRaycasting";

/**
 * The SnapPicker is a raycaster-like object specifically for Snaps. It finds snaps directly under
 * as well as "nearby" the mouse cursor, with intersect() and nearby() operations. It performs
 * sorting/prioritization based on distance as well as snap type. It is optimized for performance,
 * using a cache for most point snaps and the existing, (optimized) geometry raycasting targets.
 */

const defaultNearbyParams: THREE.RaycasterParameters = {
    Points: { threshold: 200 }
};

export class SnapPicker {
    private readonly raycaster = new THREE.Raycaster();

    constructor(
        private readonly layers: LayerManager,
        private readonly intersectParams: THREE.RaycasterParameters,
        private readonly nearbyParams: THREE.RaycasterParameters = defaultNearbyParams,
    ) {
    }

    nearby(pointPicker: Model, snaps: SnapManagerGeometryCache, db: DatabaseLike): PointSnap[] {
        const { raycaster, viewport, layers } = this;
        if (!snaps.enabled) return [];

        this.raycaster.params = this.nearbyParams;
        raycaster.layers.mask = layers.visible.mask; // FIXME: particularly with bridge, this needs to change
        if (viewport.isOrtho) raycaster.layers.disable(visual.Layers.Face); // FIXME: this is wrong, should be FaceCenterPointSnap?
        else raycaster.layers.enable(visual.Layers.Face);

        snaps.resolution.set(viewport.renderer.domElement.offsetWidth, viewport.renderer.domElement.offsetHeight);
        const snappers = snaps.points;
        const additional = pointPicker.snaps.filter(s => s instanceof PointSnap).map(s => s.snapper);
        if (snappers.length === 0 && additional.length === 0) return [];

        const intersections = raycaster.intersectObjects([...snappers, ...additional], false);
        const snap_intersections = this.intersections2snaps(snaps, intersections, db);
        const result: PointSnap[] = [];
        let i = 0;
        for (const { snap } of snap_intersections) {
            if (i++ >= 20) break;
            result.push(snap as PointSnap);
        }
        return result;
    }

    intersect(pointPicker: Model, snaps: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        const { raycaster, viewport, layers } = this;

        if (!snaps.enabled) return this.intersectConstructionPlane(pointPicker, viewport);
        if (pointPicker.choice !== undefined) return this.intersectChoice(pointPicker.choice);

        raycaster.params = this.intersectParams;
        raycaster.layers.mask = layers.visible.mask
        if (viewport.isOrtho) raycaster.layers.disable(visual.Layers.Face);
        else raycaster.layers.enable(visual.Layers.Face);

        const restrictionSnaps = pointPicker.restrictionSnapsFor(viewport.constructionPlane).map(r => r.snapper);
        let intersections: THREE.Intersection[];

        snaps.resolution.set(viewport.renderer.domElement.offsetWidth, viewport.renderer.domElement.offsetHeight);
        const snappers = snaps.snappers;
        const additional = pointPicker.snaps.map(s => s.snapper);
        let geometry = db.visibleObjects;
        // FIXME: I dislike this approach; make TranslateFact generate real TemporaryObjects rather than reusing the actual Items
        geometry = geometry.filter(item => !item.isTemporaryOptimization);
        intersections = raycaster.intersectObjects([...snappers, ...additional, ...geometry, ...restrictionSnaps], false);

        const result = [];
        if (!this.viewport.isXRay) {
            intersections = findAllVeryCloseTogether(intersections);
        }
        const extremelyCloseSnaps = this.intersections2snaps(snaps, intersections, db);
        extremelyCloseSnaps.sort(sort);

        const restrictions = pointPicker.restrictionsFor(viewport.constructionPlane);
        if (restrictions.length > 0) {
            for (const { snap, intersection } of extremelyCloseSnaps) {
                const { position: cursorPosition } = snap.project(intersection.point);
                result.push({ snap, ...restrictions[0].project(cursorPosition), cursorPosition });
            }
        } else {
            for (const { snap, intersection } of extremelyCloseSnaps) {
                const { position, orientation } = snap.project(intersection.point);
                result.push({ snap, position, orientation, cursorPosition: position });
            }
        }
        if (result.length === 0) return this.intersectConstructionPlane(pointPicker, viewport);
        else return result;
    }

    private intersections2snaps(snaps: SnapManagerGeometryCache, intersections: THREE.Intersection[], db: DatabaseLike): { snap: Snap, intersection: THREE.Intersection }[] {
        const result = [];
        for (const intersection of intersections) {
            const object = intersection.object;
            let snap: Snap;
            if (object instanceof visual.Region) {
                continue; // FIXME:
            } else if (object instanceof visual.TopologyItem || object instanceof visual.Curve3D) {
                snap = this.intersectable2snap(object, db);
            } else if (object instanceof visual.ControlPoint) {
                continue; // FIXME:
            } else if (object instanceof THREE.Points) {
                snap = snaps.get(object, intersection.index!);
            } else {
                snap = object.userData.snap as Snap;
            }
            result.push({ snap, intersection });
        }
        return result;
    }

    private intersectConstructionPlane(pointPicker: Model, viewport: Viewport): SnapResult[] {
        const { raycaster } = this;

        const constructionPlane = pointPicker.actualConstructionPlaneGiven(viewport.constructionPlane, viewport.isOrtho);
        const intersections = raycaster.intersectObject(constructionPlane.snapper);
        if (intersections.length === 0) return [];
        const approximatePosition = intersections[0].point;
        const snap = constructionPlane;
        const { position: precisePosition, orientation } = snap.project(approximatePosition);
        return [{ snap, position: precisePosition, cursorPosition: precisePosition, orientation }];
    }

    private intersectChoice(choice: AxisSnap): SnapResult[] {
        const position = choice.intersect(this.raycaster);
        if (position === undefined) return [];
        else return [{ snap: choice!, orientation: choice.orientation, position, cursorPosition: position }];
    }

    private intersectable2snap(intersectable: intersectable.Intersectable, db: DatabaseLike): Snap {
        if (intersectable instanceof visual.Face) {
            const model = db.lookupTopologyItem(intersectable);
            return new FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = db.lookupTopologyItem(intersectable);
            return new CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.Curve3D) {
            const model = db.lookup(intersectable.parentItem);
            return new CurveSnap(intersectable.parentItem, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target: " + intersectable.constructor.name);
        }
    }

    private viewport!: Viewport;
    setFromViewport(e: MouseEvent, viewport: Viewport) {
        this.setFromCamera(viewport.getNormalizedMousePosition(e), viewport.camera);
        this.viewport = viewport;
    }

    private setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.raycaster.setFromCamera(normalizedScreenPoint, camera);
    }
}

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    cursorPosition: THREE.Vector3;
    orientation: THREE.Quaternion;
}

export class SnapManagerGeometryCache {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    private readonly material = new BetterRaycastingPointsMaterial();
    get resolution() { return this.material.resolution }

    get enabled() { return this.snaps.enabled }

    constructor(private readonly snaps: SnapManager) {
        this.update();
    }

    private _points: THREE.Points[] = [];
    get points() { return this._points }

    private geometrySnaps: PointSnap[][] = [];
    private _snappers: THREE.Object3D[] = [];
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

    get snappers() {
        return this._snappers;
    }

    get(points: THREE.Points, index: number) {
        const { geometrySnaps } = this;
        const snaps = geometrySnaps[points.userData.index as number];
        return snaps[index];
    }
}

function findAllVeryCloseTogether(intersections: THREE.Intersection[]) {
    if (intersections.length === 0) return [];

    const nearest = intersections[0];
    const result = [];
    for (const intersection of intersections) {
        if (Math.abs(nearest.distance - intersection.distance) < 10e-3) {
            result.push(intersection);
        }
    }
    return result;
}

type SnapAndIntersection = {
    snap: Snap;
    intersection: THREE.Intersection;
};

function sort(i1: SnapAndIntersection, i2: SnapAndIntersection) {
    return i1.snap.priority - i2.snap.priority;
}

declare module '../editor/snaps/Snap' {
    interface Snap {
        priority: number;
    }
}

Snap.prototype.priority = 10;
FaceCenterPointSnap.prototype.priority = 0.99;
PointSnap.prototype.priority = 1;
CurveSnap.prototype.priority = 2;
AxisSnap.prototype.priority = 2;
CurveEdgeSnap.prototype.priority = 2;
FaceSnap.prototype.priority = 3;