import * as visual from './VisualModel';
import c3d from '../build/Release/c3d.node';
import * as THREE from 'three';
import { RefCounter, WeakValueMap } from './util/Util';
import { Snap } from './SnapManager';

export class Memento {
    constructor(
        readonly db: GeometryMemento,
        readonly selection: SelectionMemento,
        readonly snaps: SnapMemento
    ) { }
}

export class GeometryMemento {
    constructor(
        readonly drawModel: Set<visual.SpaceItem>,
        readonly geometryModel: Map<number, c3d.Item>,
        readonly scene: THREE.Scene,
        readonly name2topologyItem: WeakValueMap<c3d.SimpleName, visual.TopologyItem>
    ) { }
}

export class SelectionMemento {
    constructor(
        readonly selectedSolids: Set<visual.Solid>,
        readonly selectedChildren: RefCounter<unknown>,
        readonly selectedEdges: Set<visual.CurveEdge>,
        readonly selectedFaces: Set<visual.Face>,
        readonly selectedCurves: Set<visual.SpaceInstance<visual.Curve3D>>,
    ) { }
}

export class SnapMemento {
    constructor(
        readonly begPoints: Set<Snap>,
        readonly midPoints: Set<Snap>
    ) { }
}

export function Clone<T>(object: T, registry = new Map<any, any>()): T {
    let result;
    if (registry.has(object)) {
        return registry.get(object);
    } else if (object instanceof visual.Item || object instanceof visual.TopologyItem) {
        result = object.duplicate(registry);
    } else if (object instanceof Set) {
        result = new Set();
        for (const item of object.values()) {
            result.add(Clone(item, registry));
        }
    } else if (object instanceof Map) {
        result = new Map();
        for (const [key, item] of object) {
            result.set(key, Clone(item, registry));
        }
    } else if (object instanceof WeakValueMap) {
        result = new WeakValueMap();
        for (const [key, item] of object) {
            result.set(key, Clone(item, registry));
        }
    } else if (object instanceof THREE.Scene) {
        result = object.clone(false);
        for (const child of object.children) {
            result.add(Clone(child, registry));
        }
    } else if (typeof object === 'number') {
        return object;
    } else if (typeof object === 'object') {
        console.warn("This should never happen except in tests");
        result = Object.assign({}, object);
    } else {
        throw new Error("Unsupported deep clone");
    }
    registry.set(object, result);
    return result as unknown as T;
}