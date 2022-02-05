import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Choice, Model } from "../../command/PointPicker";
import { Viewport } from "../../components/viewport/Viewport";
import * as visual from "../../visual_model/VisualModel";
import { BetterRaycastingPoints } from "../../visual_model/VisualModelRaycasting";
import { DatabaseLike } from "../DatabaseLike";
import { ConstructionPlaneSnap } from "./ConstructionPlaneSnap";
import { AxisSnap, axisSnapMaterial, CurveEdgeSnap, CurveSnap, FaceCenterPointSnap, FaceSnap, PlaneSnap, PointSnap, Snap } from "./Snap";
import { originSnap, xAxisSnap, yAxisSnap, zAxisSnap } from "./SnapManager";
import { PointSnapCache, SnapManagerGeometryCache } from "./SnapManagerGeometryCache";

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

    protected _nearby(points: PointSnapCache[], snaps: SnapManagerGeometryCache): PointSnap[] {
        const { raycaster } = this;
        if (!snaps.enabled) return [];
        this.configureNearbyRaycaster(snaps);

        const everything = [...points, snaps.geometrySnaps];
        const pointss = this.prepare(everything);

        const intersections = raycaster.intersectObjects(pointss, false);
        const snap_intersections = this.intersections2snaps(snaps, intersections);
        let i = 0;
        const result: PointSnap[] = [];
        for (const { snap } of snap_intersections) {
            if (i++ >= 20) break;
            result.push(snap as PointSnap);
        }
        return result;
    }

    private prepare(everything: PointSnapCache[]) {
        const { viewport: { renderer: { domElement: { offsetWidth, offsetHeight } } } } = this;

        const pointss: BetterRaycastingPoints[] = [];
        for (const thing of everything) pointss.push(...thing.points);
        axisSnapMaterial.resolution.set(offsetWidth, offsetHeight);
        for (const thing of everything) thing.resolution.set(offsetWidth, offsetHeight);
        return pointss;
    }

    protected configureNearbyRaycaster(snaps: SnapManagerGeometryCache) {
        const { raycaster } = this;

        this.raycaster.params = this.nearbyParams;
        raycaster.layers.mask = snaps.layers.mask;
    }

    protected _intersect(additional: THREE.Object3D[], points: PointSnapCache[], snaps: SnapManagerGeometryCache, db: DatabaseLike, preference?: Snap): SnapResult[] {
        if (!snaps.enabled) return [];
        const { raycaster, viewport: { renderer, isOrthoMode, isXRay, constructionPlane: { orientation: constructionPlaneOrientation } } } = this;

        this.configureIntersectRaycaster(snaps);
        const everything = [...points, snaps.geometrySnaps];
        const pointss = this.prepare(everything);

        // Step 1: Intersect with geometry (faces, edges, curves)
        let visible = db.visibleObjects;
        visible = visible.filter(item => !item.isTemporaryOptimization); // FIXME: I dislike this approach; make TranslateFactory generate real TemporaryObjects rather than reusing the actual Items
        const geoIntersections = raycaster.intersectObjects(visible, false);
        let geo_intersections_snaps = this.intersections2snaps(snaps, geoIntersections);

        // Step 2: Check if we have a preference to stick to faces and that face is the closest geo intersection
        let restriction = undefined;
        if (preference !== undefined && geo_intersections_snaps.length > 0) {
            const first = geo_intersections_snaps[0];
            if (first.snap === preference) {
                restriction = preference;
            }
        }

        // Step 3: Intersect all the other snaps like points and axes
        const geometry = snaps.snappers;
        const other_intersections = raycaster.intersectObjects([...geometry, ...additional, ...pointss], false);
        const other_intersections_snaps = this.intersections2snaps(snaps, other_intersections);

        // Step 4.a.: Project all the intersections (go from approximate to exact values)
        let intersections_snaps = [...geo_intersections_snaps, ...other_intersections_snaps];
        let results: (SnapResult & { distance: number })[] = [];
        let minDistance = Number.MAX_VALUE;
        for (const { snap, intersection } of intersections_snaps) {
            const { position, orientation } = snap.project(intersection.point);

            // Step 4.b.: If we are on a preferred face, discard all snaps that aren't also on the face
            if (restriction && !restriction.isValid(position)) continue;

            // Step 4.c.: In ortho mode, we ignore the snap orientation
            const effectiveOrientation = isOrthoMode ? constructionPlaneOrientation : orientation;
            const distance = intersection.distance;
            const result = { distance: distance, snap, position, orientation: effectiveOrientation, cursorPosition: position, cursorOrientation: effectiveOrientation };
            if (distance < minDistance) minDistance = distance;
            results.push(result);
        }

        // Step 5. In non-XRAY mode, we only return the absolute closest.
        if (!isXRay) {
            results = findAllIntersectionsVeryCloseTogether(results, minDistance);
        }
        results.sort(sort);
        return results;
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
            } else if (object instanceof BetterRaycastingPoints) {
                const snaps = object.userData.points as PointSnap[];
                snap = snaps[intersection.index!];
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
        const points = this.collectPickerSnaps(pointPicker).points;
        return super._nearby(points, snaps);
    }

    private collectPickerSnaps(pointPicker: Model) {
        const { disabled, snapsForLastPickedPoint, activatedSnaps, otherAddedSnaps } = pointPicker.snaps;
        const notPoints = [
            ...snapsForLastPickedPoint.other,
            ...otherAddedSnaps.other,
            ...activatedSnaps.other
        ].filter(item => !disabled.has(item));
        const points = [
            otherAddedSnaps.cache,
            snapsForLastPickedPoint.cache,
            activatedSnaps.cache,
        ];
        return { points, notPoints }
    }

    protected configureNearbyRaycaster(snaps: SnapManagerGeometryCache): void {
        const { raycaster } = this;
        this.raycaster.params = this.nearbyParams;
        raycaster.layers.mask = snaps.layers.mask;
        this.toggleFaceLayer();
    }

    intersect(pointPicker: Model, cache: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        const { viewport } = this;

        if (!cache.enabled) return this.intersectConstructionPlane(pointPicker, viewport);
        if (pointPicker.choice !== undefined) {
            const chosen = this.intersectChoice(pointPicker.choice);
            return this.applyRestrictions(pointPicker, viewport, chosen);
        }

        const ppSnaps = this.collectPickerSnaps(pointPicker);
        const notPoints = ppSnaps.notPoints.map(s => s.snapper);
        const points = ppSnaps.points;
        const restrictionSnaps = pointPicker.restrictionSnapsFor().map(r => r.snapper);

        let intersections = super._intersect([...notPoints, ...restrictionSnaps], points, cache, db, pointPicker.preference?.snap);
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
        return super._nearby([], snaps);
    }

    intersect(snaps: SnapManagerGeometryCache, db: DatabaseLike): SnapResult[] {
        return super._intersect([], [], snaps, db);
    }
}

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
    cursorPosition: THREE.Vector3;
    cursorOrientation: THREE.Quaternion;
}

function findAllIntersectionsVeryCloseTogether<T extends { distance: number }>(intersections: T[], minDistance: number) {
    if (intersections.length === 0) return [];

    const result = [];
    for (const intersection of intersections) {
        if (Math.abs(minDistance - intersection.distance) < 10e-3) {
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

function sort(i1: SnapResult, i2: SnapResult) {
    return i1.snap.priority - i2.snap.priority;
}

declare module './Snap' {
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
