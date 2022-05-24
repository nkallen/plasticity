import * as THREE from "three";
import { Viewport } from "../../components/viewport/Viewport";
import { RaycastableTopologyItem } from "../../visual_model/Intersectable";
import * as visual from "../../visual_model/VisualModel";
import { BetterRaycastingPoints } from "../../visual_model/VisualModelRaycasting";
import { Empty } from "../Empties";
import { Scene } from "../Scene";
import { PointSnap } from "./PointSnap";
import { GridLike, Snap } from "./Snap";
import { SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { RaycasterParams, SnapResult } from "./SnapPicker";
import { FaceSnap } from "./Snaps";

const defaultIntersectParams: RaycasterParams = {
    Line: { threshold: 0.1 },
    Line2: { threshold: 30 },
    Points: { threshold: 26 }
};

const defaultNearbyParams: THREE.RaycasterParameters = {
    Points: { threshold: 200 }
};

type SnapAndIntersection = {
    snap: Snap;
    intersection: THREE.Intersection<THREE.Object3D<THREE.Event>>;
};

export abstract class SnapPickerStrategy {
    constructor(
        protected readonly intersectParams: RaycasterParams = defaultIntersectParams,
        protected readonly nearbyParams: THREE.RaycasterParameters = defaultNearbyParams,
    ) { }

    configureNearbyRaycaster(raycaster: THREE.Raycaster, snaps: SnapManagerGeometryCache, viewport: Viewport) {
        raycaster.params = this.nearbyParams;
        raycaster.layers.mask = snaps.layers.mask;
    }

    configureIntersectRaycaster(raycaster: THREE.Raycaster, snaps: SnapManagerGeometryCache, viewport: Viewport) {
        raycaster.params = this.intersectParams;
        raycaster.layers.mask = snaps.layers.mask;
    }

    intersectWithGeometry(raycaster: THREE.Raycaster, snaps: SnapManagerGeometryCache, scene: Scene, preference: Snap | undefined): { restriction: Snap | undefined; geo_intersections_snaps: SnapAndIntersection[] } {
        let visible = scene.visibleObjects;
        visible = visible.filter(item => !item.isTemporaryOptimization); // FIXME: I dislike this approach; make TranslateFactory generate real TemporaryObjects rather than reusing the actual Items
        const geoIntersections = raycaster.intersectObjects(visible, false);
        const geo_intersections_snaps = this.intersections2snaps(snaps, geoIntersections);
        let restriction = undefined;
        if (preference !== undefined && geo_intersections_snaps.length > 0) {
            const first = geo_intersections_snaps[0];
            if (first.snap === preference) {
                restriction = preference;
            }
        }
        return { restriction, geo_intersections_snaps }
    }

    intersectWithSnaps(additional: readonly THREE.Object3D[], pointss: readonly BetterRaycastingPoints[], raycaster: THREE.Raycaster, snaps: SnapManagerGeometryCache): SnapAndIntersection[] {
        const other_intersections = raycaster.intersectObjects([...snaps.basic, ...additional, ...pointss], false);
        const other_intersections_snaps = this.intersections2snaps(snaps, other_intersections);
        return other_intersections_snaps;
    }

    // Project all the intersections (go from approximate to exact values)
    // Fold in any additional results (sometimes the construction plane)
    // return min distance
    projectIntersections(viewport: Viewport, geo_intersections_snaps: SnapAndIntersection[], other_intersections_snaps: SnapAndIntersection[], cplane_intersection_results: (SnapResult & { distance: number })[], restriction: Snap | undefined, snapToGrid: GridLike | undefined) {
        const { isOrthoMode, constructionPlane: { orientation: constructionPlaneOrientation } } = viewport;

        const intersections_snaps = [...geo_intersections_snaps, ...other_intersections_snaps];
        let results: (SnapResult & { distance: number })[] = [];
        let minDistance = Number.MAX_VALUE;
        for (const { snap, intersection } of intersections_snaps) {
            const { position, orientation } = snap.project(intersection.point, snapToGrid);

            // Step 4.b.: If we are on a preferred face, discard all snaps that aren't also on the face
            if (restriction && !restriction.isValid(position)) continue;

            // Step 4.c.: In ortho mode, we ignore the snap orientation
            const effectiveOrientation = isOrthoMode ? constructionPlaneOrientation : orientation;
            const distance = intersection.distance;
            const result = { distance: distance, snap, position, orientation: effectiveOrientation, cursorPosition: position, cursorOrientation: effectiveOrientation };
            if (distance < minDistance) minDistance = distance;
            results.push(result);
        }
        for (const o of cplane_intersection_results) {
            if (o.distance < minDistance) minDistance = o.distance;
        }
        results = results.concat(cplane_intersection_results)
        return { minDistance, results };
    }

    processXRay(viewport: Viewport, results: (SnapResult & { distance: number })[], cplane_intersection_results: (SnapResult & { distance: number })[], minDistance: number) {
        const { isXRay, isOrthoMode } = viewport;
        if (isOrthoMode) {
            results = results.filter(r => !(r.snap instanceof FaceSnap));
        }
        if (!isXRay) {
            results = findAllIntersectionsVeryCloseTogether(results, minDistance);
            if (isOrthoMode && results.length === 0) {
                // This case happens when intersecting a face above the construction plane in ortho and non-xray mode
                results = cplane_intersection_results;
            }
        }

        return results;
    }

    private intersections2snaps(snaps: SnapManagerGeometryCache, intersections: THREE.Intersection[]): { snap: Snap, intersection: THREE.Intersection }[] {
        const result = [];
        for (const intersection of intersections) {
            const object = intersection.object;
            let snap: Snap;
            if (object instanceof visual.Region) {
                continue; // FIXME:
            } else if (object instanceof RaycastableTopologyItem) {
                // @ts-expect-error
                snap = snaps.lookup(intersection.topologyItem);
            } else if (object instanceof visual.Curve3D) {
                snap = snaps.lookup(object);
            } else if (object instanceof visual.ControlPoint) {
                continue; // FIXME:
            } else if (object instanceof BetterRaycastingPoints) {
                const snaps = object.userData.points as PointSnap[];
                snap = snaps[intersection.index!];
            } else if (object instanceof Empty) {
                continue;
            } else {
                if (object === undefined || object.userData === undefined || object.userData.snap === undefined) throw new Error(`invalid precondition: ${object.constructor.name} has no snap`);
                snap = object.userData.snap as Snap;
            }
            result.push({ snap, intersection });
        }
        return result;
    }
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