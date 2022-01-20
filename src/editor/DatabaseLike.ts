import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import c3d from '../../build/Release/c3d.node';
import { GConstructor } from '../util/Util';
import * as visual from '../visual_model/VisualModel';
import { BetterRaycastingPointsMaterial } from '../visual_model/VisualModelRaycasting';

export type Agent = 'user' | 'automatic';

export interface TemporaryObject {
    get underlying(): THREE.Object3D;
    cancel(): void;
    show(): void;
    hide(): void;
}

export type TopologyData = { model: c3d.TopologyItem, views: Set<visual.Face | visual.Edge> };
export type ControlPointData = { index: number, views: Set<visual.ControlPoint> };

export interface MaterialOverride {
    region?: THREE.Material;
    line?: LineMaterial;
    lineDashed?: LineMaterial;
    controlPoint?: BetterRaycastingPointsMaterial;
    mesh?: THREE.Material;
    surface?: THREE.Material;
}

export interface DatabaseLike {
    get version(): number; addItem(model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    addItem(model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    addItem(model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    addItem(model: c3d.Item, agent?: Agent): Promise<visual.Item>;

    replaceItem(from: visual.Solid, model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    replaceItem<T extends visual.SpaceItem>(from: visual.SpaceInstance<T>, model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    replaceItem<T extends visual.PlaneItem>(from: visual.PlaneInstance<T>, model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    replaceItem(from: visual.Item, model: c3d.Item, agent?: Agent): Promise<visual.Item>;
    replaceItem(from: visual.Item, model: c3d.Item): Promise<visual.Item>;

    removeItem(view: visual.Item, agent?: Agent): Promise<void>;

    duplicate(model: visual.Solid): Promise<visual.Solid>;
    duplicate<T extends visual.SpaceItem>(model: visual.SpaceInstance<T>): Promise<visual.SpaceInstance<T>>;
    duplicate<T extends visual.PlaneItem>(model: visual.PlaneInstance<T>): Promise<visual.PlaneInstance<T>>;
    duplicate(model: visual.CurveEdge): Promise<visual.SpaceInstance<visual.Curve3D>>;

    addPhantom(object: c3d.Item, materials?: MaterialOverride): Promise<TemporaryObject>;
    addTemporaryItem(object: c3d.Item): Promise<TemporaryObject>;
    replaceWithTemporaryItem(from: visual.Item, object: c3d.Item): Promise<TemporaryObject>;
    optimization<T>(from: visual.Item, fast: () => T, ifDisallowed: () => T): T;

    clearTemporaryObjects(): void;
    readonly temporaryObjects: THREE.Scene; // FIXME: should this really be public?
    readonly phantomObjects: THREE.Scene;

    lookup(object: visual.Solid): c3d.Solid;
    lookup(object: visual.SpaceInstance<visual.Curve3D>): c3d.SpaceInstance;
    lookup(object: visual.PlaneInstance<visual.Region>): c3d.PlaneInstance;
    lookup(object: visual.Item): c3d.Item;

    lookupItemById(id: c3d.SimpleName): { view: visual.Item; model: c3d.Item; };

    hasTopologyItem(id: string): boolean;
    lookupTopologyItemById(id: string): TopologyData;
    lookupTopologyItem(object: visual.Face): c3d.Face;
    lookupTopologyItem(object: visual.CurveEdge): c3d.CurveEdge;
    lookupControlPointById(id: string): ControlPointData;

    find<T extends visual.PlaneInstance<visual.Region>>(klass: GConstructor<T>): { view: T; model: c3d.PlaneInstance; }[];
    find<T extends visual.SpaceInstance<visual.Curve3D>>(klass: GConstructor<T>): { view: T; model: c3d.SpaceInstance; }[];
    find<T extends visual.Solid>(klass: GConstructor<T>): { view: T; model: c3d.Solid; }[];
    find(): { view: visual.Item; model: c3d.Solid; }[];

    get visibleObjects(): visual.Item[]; hide(item: visual.Item): Promise<void>;
    get selectableObjects(): visual.Item[]; hide(item: visual.Item): Promise<void>;

    unhide(item: visual.Item): Promise<void>;
    unhideAll(): Promise<visual.Item[]>;

    deserialize(data: Buffer): Promise<void>;
    load(model: c3d.Model | c3d.Assembly): Promise<void>;
}
