import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Choice, Model } from "../command/PointPicker";
import { Viewport } from "../components/viewport/Viewport";
import { DatabaseLike } from "../editor/DatabaseLike";
import { ConstructionPlaneSnap } from "../editor/snaps/ConstructionPlaneSnap";
import { AxisSnap, axisSnapMaterial, CurveEdgeSnap, CurveSnap, FaceCenterPointSnap, FaceSnap, PlaneSnap, PointSnap, Snap } from "../editor/snaps/Snap";
import { originSnap, xAxisSnap, yAxisSnap, zAxisSnap } from "../editor/snaps/SnapManager";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import * as visual from "./VisualModel";

/**
 * The SnapPicker is a raycaster-like object specifically for Snaps. It finds snaps directly under
 * as well as "nearby" the mouse cursor, with intersect() and nearby() operations. It performs
 * sorting/prioritization based on distance as well as snap type. It is optimized for performance,
 * using a cache for most point snaps and the existing, (optimized) geometry raycasting targets.
 */

export type RaycasterParams = THREE.RaycasterParameters & {
    Line2: { threshold: number }
    Points: { threshold: number }
};

const defaultIntersectParams: RaycasterParams = {
    Line: { threshold: 0.1 },
    Line2: { threshold: 30 },
    Points: { threshold: 26 }
};

const defaultNearbyParams: THREE.RaycasterParameters = {
    Points: { threshold: 200 }
};

abstract class AbstractSnapPicker {
    constructor(
        protected readonly intersectParams: RaycasterParams = defaultIntersectParams,
        protected readonly nearbyParams: THREE.RaycasterParameters = defaultNearbyParams,
        protected readonly raycaster = new THREE.Raycaster()
    ) { }

    protected _nearby(additional: THREE.Object3D[], snaps: SnapManagerGeometryCache, db: DatabaseLike): PointSnap[] {
        const { raycaster, viewport } = this;
        if (!snaps.enabled) return [];

        this.configureNearbyRaycaster(snaps);

        snaps.resolution.set(viewport.renderer.domElement.offsetWidth, viewport.renderer.domElement.offsetHeight);
        const snappers = snaps.points;
        if (snappers.length === 0 && additional.length === 0) return [];

        const intersections = raycaster.intersectObjects([...snappers, ...additional], false);
        const snap_intersections = this.intersections2snaps(snaps, intersections);
        const result: PointSnap[] = [];
        let i = 0;
        for (const { snap } of snap_intersections) {
            if (i++ >= 20) break;
            result.push(snap as PointSnap);
        }
        return result;
    }

    protected configureNearbyRaycaster(snaps: SnapManagerGeometryCache) {
        const { raycaster } = this;

        this.raycaster.params = this.nearbyParams;
        raycaster.layers.mask = snaps.layers.mask;
    }

    protected _intersect(additional: THREE.Object3D[], snaps: SnapManagerGeometryCache, db: DatabaseLike, preference?: Snap): SnapResult[] {
        const { raycaster, viewport } = this;
        if (!snaps.enabled) return [];

        this.configureIntersectRaycaster(snaps);

        let intersections: THREE.Intersection[];

        snaps.resolution.set(viewport.renderer.domElement.offsetWidth, viewport.renderer.domElement.offsetHeight);
        axisSnapMaterial.resolution.copy(snaps.resolution);

        const snappers = snaps.snappers;
        let geometry = db.visibleObjects;
        // FIXME: I dislike this approach; make TranslateFact generate real TemporaryObjects rather than reusing the actual Items
        geometry = geometry.filter(item => !item.isTemporaryOptimization);
        intersections = raycaster.intersectObjects([...snappers, ...additional, ...geometry], false);

        let intersections_snaps = this.intersections2snaps(snaps, intersections);

        if (preference !== undefined) {
            for (const intersection of intersections_snaps) {
                if (intersection.snap === preference) {
                    intersections_snaps = [intersection];
                    break;
                }
            }
        }

        if (!this.viewport.isXRay) {
            intersections_snaps = findAllIntersectionsVeryCloseTogether(intersections_snaps);
        }
        intersections_snaps.sort(sort);

        let result: SnapResult[] = [];
        for (const { snap, intersection } of intersections_snaps) {
            const { position, orientation } = snap.project(intersection.point);
            result.push({ snap, position, orientation, cursorPosition: position, cursorOrientation: orientation });
        }
        return result;
    }

    protected configureIntersectRaycaster(snaps: SnapManagerGeometryCache) {
        const { raycaster } = this;

        this.raycaster.params = this.intersectParams;
        raycaster.layers.mask = snaps.layers.mask;
    }


    protected intersections2snaps(snaps: SnapManagerGeometryCache, intersections: THREE.Intersection[]): { snap: Snap, intersection: THREE.Intersection }[] {
        const result = [];
        for (const intersection of intersections) {
            const object = intersection.object;
            let snap: Snap;
            if (object instanceof visual.Region) {
                continue; // FIXME:
            } else if (object instanceof visual.TopologyItem || object instanceof visual.Curve3D) {
                snap = snaps.lookup(object);
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

    protected viewport!: Viewport;
    setFromViewport(e: MouseEvent, viewport: Viewport) {
        this.setFromCamera(viewport.getNormalizedMousePosition(e), viewport.camera);
        this.viewport = viewport;
    }

    private setFromCamera(normalizedScreenPoint: THREE.Vector2, camera: THREE.Camera) {
        this.raycaster.setFromCamera(normalizedScreenPoint, camera);
    }
}

export class SnapPicker extends AbstractSnapPicker {
    readonly disposable = new CompositeDisposable();

    nearby(pointPicker: Model, snaps: SnapManagerGeometryCache, db: DatabaseLike): PointSnap[] {
        const additional = pointPicker.snaps.filter(s => s instanceof PointSnap).map(s => s.snapper);
        return super._nearby(additional, snaps, db);
    }

    protected configureNearbyRaycaster(snaps: SnapManagerGeometryCache): void {
        const { raycaster } = this;
        this.raycaster.params = this.nearbyParams;
        raycaster.layers.mask = snaps.layers.mask;
        this.toggleFaceLayer();
    }

    intersect(pointPicker: Model, snaps: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        const { viewport } = this;

        if (!snaps.enabled) return this.intersectConstructionPlane(pointPicker, viewport);
        if (pointPicker.choice !== undefined) {
            const chosen = this.intersectChoice(pointPicker.choice);
            return this.applyRestrictions(pointPicker, viewport, chosen);
        }

        const additional = pointPicker.snaps.map(s => s.snapper);
        const restrictionSnaps = pointPicker.restrictionSnapsFor().map(r => r.snapper);
        let intersections = super._intersect([...additional, ...restrictionSnaps], snaps, db, pointPicker.preference?.snap);

        intersections = intersections.concat(this.intersectConstructionPlane(pointPicker, viewport));
        const restricted = this.applyRestrictions(pointPicker, viewport, intersections);

        return findAllSnapsInTheSamePlace(restricted);
    }

    protected override configureIntersectRaycaster(snaps: SnapManagerGeometryCache): void {
        const { raycaster } = this;
        raycaster.params = this.intersectParams;
        raycaster.layers.mask = snaps.layers.mask
        this.toggleFaceLayer();
    }

    private toggleFaceLayer() {
        const { disposable, viewport, raycaster } = this;
        if (viewport.isOrthoMode) {
            raycaster.layers.disable(visual.Layers.Face);
            disposable.add(new Disposable(() => { raycaster.layers.enable(visual.Layers.Face); }));
        }
    }

    private applyRestrictions(pointPicker: Model, viewport: Viewport, input: SnapResult[]) {
        const restriction = pointPicker.restrictionFor(viewport.constructionPlane, viewport.isOrthoMode);
        if (restriction === undefined) return input;

        const output = [];
        for (const info of input) {
            if (!restriction.isValid(info.position)) continue;
            const { position, orientation } = restriction.project(info.position);
            info.position = position;
            info.orientation = orientation;
            output.push(info);
        }
        return output;
    }

    private intersectConstructionPlane(pointPicker: Model, viewport: Viewport): SnapResult[] {
        const { raycaster } = this;

        const constructionPlane = pointPicker.actualConstructionPlaneGiven(viewport.constructionPlane, viewport.isOrthoMode);
        const intersections = raycaster.intersectObject(constructionPlane.snapper);
        if (intersections.length === 0) return [];
        const approximatePosition = intersections[0].point;
        const snap = constructionPlane;
        const { position: precisePosition, orientation } = snap.project(approximatePosition);
        return [{ snap, position: precisePosition, cursorPosition: precisePosition, orientation, cursorOrientation: orientation }];
    }

    private intersectChoice(choice: Choice): SnapResult[] {
        const snap = choice.snap;
        const intersection = snap.intersect(this.raycaster, choice.info);
        if (intersection === undefined) return [];
        const { position, orientation } = intersection;
        return [{ snap, orientation: orientation, position, cursorPosition: position, cursorOrientation: orientation }];
    }
}

export class GizmoSnapPicker extends AbstractSnapPicker {
    nearby(snaps: SnapManagerGeometryCache, db: DatabaseLike): PointSnap[] {
        return super._nearby([], snaps, db);
    }

    intersect(snaps: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        return super._intersect([], snaps, db);
    }
}

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
    cursorPosition: THREE.Vector3;
    cursorOrientation: THREE.Quaternion;
}

function findAllIntersectionsVeryCloseTogether(intersections: { snap: Snap; intersection: THREE.Intersection<THREE.Object3D<THREE.Event>>; }[]) {
    if (intersections.length === 0) return [];

    const nearest = intersections[0];
    const result = [];
    for (const intersection of intersections) {
        if (Math.abs(nearest.intersection.distance - intersection.intersection.distance) < 10e-3) {
            result.push(intersection);
        }
    }
    return result;
}

function findAllSnapsInTheSamePlace(snaps: SnapResult[]) {
    if (snaps.length === 0) return [];

    const { position: nearest } = snaps[0];
    const result = [];
    for (const snap of snaps) {
        if (Math.abs(nearest.manhattanDistanceTo(snap.position)) < 10e-5) {
            result.push(snap);
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
PlaneSnap.prototype.priority = 4;
ConstructionPlaneSnap.prototype.priority = 5;

originSnap.priority = 3;
xAxisSnap.priority = 4;
yAxisSnap.priority = 4;
zAxisSnap.priority = 4;
