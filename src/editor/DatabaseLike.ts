import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import * as c3d from '../kernel/kernel';
import * as visual from '../visual_model/VisualModel';
import { BetterRaycastingPointsMaterial } from '../visual_model/VisualModelRaycasting';
import { SolidCopierPool } from './SolidCopier';

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

    // TODO: rename lookup by version
    lookupItemById(id: c3d.SimpleName): { view: visual.Item; model: c3d.Item; };

    hasTopologyItem(id: string): boolean;
    lookupTopologyItemById(id: string): TopologyData;
    lookupTopologyItem(object: visual.Face): c3d.Face;
    lookupTopologyItem(object: visual.CurveEdge): c3d.CurveEdge;
    lookupControlPointById(id: string): ControlPointData;

    find(klass: typeof visual.PlaneInstance, includeAutomatics?: boolean): { view: visual.PlaneInstance<visual.Region>; model: c3d.PlaneInstance; }[];
    find(klass: typeof visual.SpaceInstance, includeAutomatics?: boolean): { view: visual.SpaceInstance<visual.Curve3D>; model: c3d.SpaceInstance; }[];
    find(klass: typeof visual.Solid, includeAutomatics?: boolean): { view: visual.Solid; model: c3d.Solid; }[];
    findAll(includeAutomatics?: boolean): { view: visual.Item, model: c3d.Solid }[];

    lookupId(version: c3d.SimpleName): number | undefined;
    lookupById(name: c3d.SimpleName): { view: visual.Item; model: c3d.Item; };
    pool(solid: c3d.Solid, size: number): SolidCopierPool;

    deserialize(data: Buffer): Promise<visual.Item[]>;
    load(model: c3d.Model | c3d.Assembly): Promise<visual.Item[]>;
}
