import * as THREE from 'three';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from './Editor';
import { Snap } from './SnapManager';
import { RefCounter, WeakValueMap } from './util/Util';
import * as visual from './VisualModel';

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
        readonly selectedChildren: RefCounter<visual.SpaceItem>,
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


export type StateChange = (f: () => void) => void;

type OriginatorState = { tag: 'start' } | { tag: 'group', memento: Memento }
export class EditorOriginator {
    state: OriginatorState = { tag: 'start' }

    constructor(
        readonly db: MementoOriginator<GeometryMemento>,
        readonly selection: MementoOriginator<SelectionMemento>,
        readonly snaps: MementoOriginator<SnapMemento>
    ) { }

    group(registry: Map<any, any>, fn: () => void) {
        const memento = new Memento(
            this.db.saveToMemento(registry),
            this.selection.saveToMemento(registry),
            this.snaps.saveToMemento(registry));

        this.state = { tag: 'group', memento: memento };
        try {
            fn();
        } finally {
            this.state = { tag: 'start' };
        }
    }

    saveToMemento(registry: Map<any, any>): Memento {
        switch (this.state.tag) {
            case 'start':
                return new Memento(
                    this.db.saveToMemento(registry),
                    this.selection.saveToMemento(registry),
                    this.snaps.saveToMemento(registry));
            case 'group':
                return this.state.memento;
        }
    }

    restoreFromMemento(m: Memento) {
        this.db.restoreFromMemento(m.db);
        this.selection.restoreFromMemento(m.selection);
        this.snaps.restoreFromMemento(m.snaps);
    }
}

interface MementoOriginator<T> {
    saveToMemento(registry: Map<any, any>): T;
    restoreFromMemento(m: T): void;
}

export class History {
    private readonly undoStack: [String, Memento][] = [];
    private readonly redoStack: [String, Memento][] = [];

    constructor(
        private readonly originator: EditorOriginator,
        private readonly signals: EditorSignals
    ) { }

    add(name: String, state: Memento) {
        if (this.undoStack.length > 0 &&
            this.undoStack[this.undoStack.length - 1][1] === state) return;
        this.undoStack.push([name, state]);
    }

    undo(): boolean {
        const undo = this.undoStack.pop();
        if (!undo) return false;

        const [, memento] = undo;
        this.originator.restoreFromMemento(memento);
        this.redoStack.push(undo);

        this.signals.historyChanged.dispatch();
        return true;
    }

    redo(): boolean {
        const redo = this.redoStack.pop();
        if (!redo) return false;

        const [, memento] = redo;
        this.originator.restoreFromMemento(memento);
        this.undoStack.push(redo);
        this.signals.historyChanged.dispatch();

        return true;
    }
}

export function Clone<T>(object: T, registry: Map<any, any>): T {
    let result;
    if (registry.has(object)) {
        return registry.get(object);
    } else if (object instanceof visual.Solid || object instanceof visual.SpaceInstance || object instanceof visual.PlaneInstance) {
        if (object instanceof visual.Solid) {
            result = new visual.Solid();
            result.copy(object, false);
        } else if (object instanceof visual.SpaceInstance) {
            result = new visual.SpaceInstance();
            result.copy(object, false);
        } else if (object instanceof visual.PlaneInstance) {
            result = new visual.PlaneInstance();
            result.copy(object, false);
        } else {
            throw new Error("invalid precondition");
        }
        result.disposable = object.disposable;
        for (const level of object.lod.levels) {
            result.lod.addLevel(Clone(level.object, registry), level.distance);
        }
        result.userData = object.userData;
    } else if (object instanceof visual.FaceGroup || object instanceof visual.CurveEdgeGroup || object instanceof visual.Curve3D || object instanceof visual.RecursiveGroup) {
        result = object.clone(false);
        for (const child of object.children) {
            result.add(Clone(child, registry));
        }
    } else if (object instanceof visual.TopologyItem || object instanceof visual.CurveEdge || object instanceof visual.CurveSegment || object instanceof visual.Region) {
        result = object.clone(false);
        result.userData = object.userData;
    } else if (object instanceof c3d.Item || object instanceof c3d.TopologyItem) {
        result = object;
    } else if (object instanceof THREE.AxesHelper) {
        result = object.clone(); // FIXME shouldn't really do this, but add helpers just before render.
    } else if (object instanceof RefCounter) {
        result = new RefCounter();
        const counts = new Map();
        for (const [key, item] of result.counts) {
            counts.set(Clone(key, registry), item);
        }
        (result.counts as RefCounter<T>['counts']) = counts;
    } else if (object instanceof Snap) {
        result = object;
    } else if (object instanceof Set) {
        result = new Set();
        for (const item of object.values()) {
            result.add(Clone(item, registry));
        }
    } else if (object instanceof Map) {
        result = new Map();
        for (const [key, item] of object) {
            result.set(Clone(key, registry), Clone(item, registry));
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
    } else {
        console.error(object);
        throw new Error("Unsupported deep clone.");
    }
    registry.set(object, result);
    return result as unknown as T;
}