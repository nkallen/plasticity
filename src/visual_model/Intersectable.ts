import * as THREE from "three";
import { ControlPoint, Curve3D, Layers, Region, TopologyItem } from "../visual_model/VisualModel";

// It's important to conceptually distinguish intersectable objects from selectable objects
// Selectable objects are what the user actually stores in a selection (e.g., a SpaceInstance<Curve3D>)
// whereas the user actually clicks on (intersects) a CurveSegment (and its children).

export type Intersectable = Curve3D | TopologyItem | ControlPoint | Region;

export interface Intersection {
    object: Intersectable;
    point: THREE.Vector3;
}

export const xray = new THREE.Layers();
xray.disableAll();
xray.enable(Layers.XRay);
xray.enable(Layers.CurveFragment_XRay);