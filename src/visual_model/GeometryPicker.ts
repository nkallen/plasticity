import * as THREE from "three";
import { Viewport } from "../components/viewport/Viewport";
import LayerManager from "../editor/LayerManager";
import * as intersectable from "./Intersectable";
import { ControlPoint, Curve3D, CurveEdge, Face, Region } from "./VisualModel";

export class GeometryPicker {
    private readonly raycaster = new THREE.Raycaster();

    constructor(
        private readonly layers: LayerManager,
        private readonly raycasterParams: THREE.RaycasterParameters,
    ) {
        this.raycaster.layers = layers.visible;
    }

    intersect(objects: THREE.Object3D[], isXRay = this.viewport.isXRay): intersectable.Intersection[] {
        const { raycaster } = this;

        this.raycaster.params = this.raycasterParams;
        let intersections = raycaster.intersectObjects(objects, false) as THREE.Intersection<intersectable.Intersectable>[];
        if (!isXRay) {
            intersections = findAllVeryCloseTogether(intersections);
        }
        return intersections.sort(sort);
    }

    private viewport!: Viewport;
    setFromViewport(normalizedScreenPoint: THREE.Vector2, viewport: Viewport) {
        this.raycaster.setFromCamera(normalizedScreenPoint, viewport.camera);
        this.viewport = viewport;
    }

}

function findAllVeryCloseTogether(intersections: THREE.Intersection<intersectable.Intersectable>[]) {
    if (intersections.length === 0) return [];

    const nearest = intersections[0];
    const result = [];
    for (const intersection of intersections) {
        if (Math.abs(nearest.distance - intersection.distance) < 10e-2) {
            result.push(intersection);
        }
    }
    return result;
}

function sort(i1: THREE.Intersection<intersectable.Intersectable>, i2: THREE.Intersection<intersectable.Intersectable>) {
    const o1 = i1.object, o2 = i2.object;
    const p1 = o1.priority, p2 = o2.priority;
    if (p1 === p2) {
        if (o1 instanceof CurveEdge && o2 instanceof CurveEdge) {
            // @ts-expect-error
            return i1.point.distanceToSquared(i1.pointOnLine) - i2.point.distanceToSquared(i2.pointOnLine);
        } else return 0;
    } else return p1 - p2;
}

declare module './VisualModel' {
    interface ControlPoint { priority: number }
    interface TopologyItem { priority: number }
    interface SpaceItem { priority: number }
    interface PlaneItem { priority: number }
}

ControlPoint.prototype.priority = 1;
Curve3D.prototype.priority = 2;
CurveEdge.prototype.priority = 3;
Region.prototype.priority = 4;
Face.prototype.priority = 5;
