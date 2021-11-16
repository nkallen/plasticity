import * as THREE from "three";
import { BetterRaycastingPoint } from '../util/BetterRaycastingPoints';
import { IntersectableLayers } from "./LayerManager";
import { ControlPoint, ControlPointGroup, Curve3D, CurveSegment, Layers, Region, Solid, TopologyItem } from "./VisualModel";

// It's important to conceptually distinguish intersectable objects from selectable objects
// Selectable objects are what the user actually stores in a selection (e.g., a SpaceInstance<Curve3D>)
// whereas the user actually clicks on (intersects) a CurveFragment (and it's child mesh).

export type Intersectable = Curve3D | TopologyItem | ControlPoint | Region;

export interface Intersection {
    object: Intersectable;
    point: THREE.Vector3;
}

// The following two methods are used for raycast (point and click) and box selection --
// They take primitive view objects (Line2, Mesh, etc.), filter out the irrelevant (invisible, etc.),
// and return higher level view objects (Face, CurveEdge, Region, etc.).

export function filterMeshes(selected: THREE.Mesh[]): Set<Intersectable> {
    const result = new Set<Intersectable>();
    for (const object of selected) {
        if (!isSelectable(object)) continue;

        const intersectable = findIntersectable(object);
        result.add(intersectable);
    }
    return result;
}

function isSelectable(object: THREE.Object3D): boolean {
    if (!object.layers.test(IntersectableLayers)) return false;

    let parent: THREE.Object3D | null = object;
    while (parent) {
        if (!parent.visible) return false;
        parent = parent.parent;
    }
    return true;
}

function findIntersectable(object: THREE.Object3D, index?: number): Intersectable {
    if (object instanceof BetterRaycastingPoint) {
        throw "broekn";
    } else {
        const parent = object.parent!;
        if (parent instanceof Solid || parent instanceof TopologyItem || parent instanceof Region)
            return parent as Intersectable;
        if (parent instanceof CurveSegment)
            return parent.parent!.parent! as Curve3D;

        throw new Error("invalid precondition: " + parent.constructor.name);
    }
}


export const xray = new THREE.Layers();
xray.disableAll();
xray.enable(Layers.XRay);
xray.enable(Layers.CurveFragment_XRay);