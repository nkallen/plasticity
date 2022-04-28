import * as THREE from "three";
import { ImageEmpty } from "../editor/Empties";
import { ControlPoint, Curve3D, CurveEdge, Face, Region, TopologyItem } from "../visual_model/VisualModel";

// It's important to conceptually distinguish intersectable objects from selectable objects
// Selectable objects are what the user actually stores in a selection (e.g., a SpaceInstance<Curve3D>)
// whereas the user actually clicks on (intersects) a CurveSegment (and its children).

export class RaycastableTopologyItem extends THREE.Object3D {
    private _topologyItem!: TopologyItem;
    get priority() { return this._topologyItem.priority }

    set topologyItem(topologyItem: TopologyItem) {
        this._topologyItem = topologyItem;
        this.layers.mask = topologyItem.layers.mask;
    }

    constructor(topologyItem?: TopologyItem) {
        super();
        if (topologyItem !== undefined) this._topologyItem = topologyItem;
    }
}

export type Raycastable = Curve3D | RaycastableTopologyItem | ControlPoint | Region | ImageEmpty;
export type Intersectable = Curve3D | Face | CurveEdge | ControlPoint | Region | ImageEmpty;

export interface Intersection {
    object: Intersectable;
    point: THREE.Vector3;
}
