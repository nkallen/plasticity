import * as THREE from "three";
import { Viewport } from "../../components/viewport/Viewport";
import * as visual from "../../visual_model/VisualModel";
import { BetterRaycastingPoints } from "../../visual_model/VisualModelRaycasting";
import { Scene } from "../Scene";
import { AxisSnap, axisSnapMaterial } from "./AxisSnap";
import { ConstructionPlaneSnap, FaceConstructionPlaneSnap } from "./ConstructionPlaneSnap";
import { PlaneSnap } from "./PlaneSnap";
import { PointSnap } from "./PointSnap";
import { Snap } from "./Snap";
import { originSnap, xAxisSnap, yAxisSnap, zAxisSnap } from "./SnapManager";
import { PointSnapCache, SnapManagerGeometryCache } from "./SnapManagerGeometryCache";
import { SnapPickerStrategy } from "./SnapPickerStrategy";
import { CurveEdgeSnap, CurveSnap, FaceCenterPointSnap, FaceSnap } from "./Snaps";

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

export const defaultIntersectParams: RaycasterParams = {
    Line: { threshold: 0.1 },
    Line2: { threshold: 30 },
    Points: { threshold: 26 }
};

export const defaultNearbyParams: THREE.RaycasterParameters = {
    Points: { threshold: 200 }
};

export class SnapPicker {
    constructor(
        protected readonly raycaster = new THREE.Raycaster(),
        private readonly strategy: SnapPickerStrategy,
    ) { }

    nearby(points: PointSnapCache[], snaps: SnapManagerGeometryCache): PointSnap[] {
        const { raycaster, strategy, viewport } = this;
        if (!snaps.enabled) return [];
        strategy.configureNearbyRaycaster(raycaster, snaps, viewport);

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

    intersect(additional: readonly THREE.Object3D[], points: readonly PointSnapCache[], snaps: SnapManagerGeometryCache, scene: Scene, cplane_intersection_results: (SnapResult & { distance: number })[], preference?: Snap): SnapResult[] {
        if (!snaps.enabled) return [];
        const { strategy, raycaster, viewport } = this;

        strategy.configureIntersectRaycaster(raycaster, snaps, viewport);
        const everything = [...points, snaps.geometrySnaps];
        const pointss = this.prepare(everything);

        const { restriction, geo_intersections_snaps } = strategy.intersectWithGeometry(raycaster, snaps, scene, preference);

        const other_intersections_snaps = strategy.intersectWithSnaps(additional, pointss, raycaster, snaps);

        let { minDistance, results } = strategy.projectIntersections(viewport, geo_intersections_snaps, other_intersections_snaps, cplane_intersection_results, restriction);
        results = strategy.processXRay(viewport, results, minDistance);
        return this.sort(results);
    }

    sort(results: SnapResult[]) {
        return results.sort(sort);
    }

    protected intersections2snaps(snaps: SnapManagerGeometryCache, intersections: THREE.Intersection[]): { snap: Snap, intersection: THREE.Intersection }[] {
        const result = [];
        for (const intersection of intersections) {
            const object = intersection.object;
            let snap: Snap;
            if (object instanceof visual.Region) {
                continue; // FIXME:
            } else if (object instanceof visual.Face || object instanceof visual.CurveEdge || object instanceof visual.Curve3D) {
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

    viewport!: Viewport;
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
    orientation: THREE.Quaternion;
    cursorPosition: THREE.Vector3;
    cursorOrientation: THREE.Quaternion;
}

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
FaceConstructionPlaneSnap.prototype.priority = 3;
FaceSnap.prototype.priority = 3;
PlaneSnap.prototype.priority = 4;
ConstructionPlaneSnap.prototype.priority = 5;

originSnap.priority = 3;
xAxisSnap.priority = 4;
yAxisSnap.priority = 4;
zAxisSnap.priority = 4;

