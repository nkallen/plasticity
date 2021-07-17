import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from './Editor';
import { TopologyData } from './GeometryDatabase';
import { Snap } from './SnapManager';
import { RefCounter } from '../util/Util';
import * as visual from './VisualModel';

export class Memento {
    constructor(
        readonly version: number,
        readonly db: GeometryMemento,
        readonly selection: SelectionMemento,
        readonly snaps: SnapMemento
    ) { }
}

export class GeometryMemento {
    constructor(
        readonly geometryModel: Map<c3d.SimpleName, { view: visual.Item, model: c3d.Item }>,
        readonly topologyModel: Map<string, TopologyData>,
        readonly hidden: Set<c3d.SimpleName>
    ) { }
}

export class SelectionMemento {
    constructor(
        readonly selectedSolidIds: Set<c3d.SimpleName>,
        readonly parentsWithSelectedChildren: RefCounter<c3d.SimpleName>,
        readonly selectedEdgeIds: Set<string>,
        readonly selectedFaceIds: Set<string>,
        readonly selectedCurveIds: Set<c3d.SimpleName>,
        readonly selectedRegionIds: Set<c3d.SimpleName>,
    ) { }
}

export class SnapMemento {
    constructor(
        readonly garbageDisposal: RefCounter<c3d.SimpleName>,
        readonly begPoints: Set<Snap>,
        readonly midPoints: Set<Snap>,
        readonly endPoints: Set<Snap>
    ) { }
}


export type StateChange = (f: () => void) => void;

type OriginatorState = { tag: 'start' } | { tag: 'group', memento: Memento }
export class EditorOriginator {
    private state: OriginatorState = { tag: 'start' }
    private version = 0;

    constructor(
        readonly db: MementoOriginator<GeometryMemento>,
        readonly selection: MementoOriginator<SelectionMemento>,
        readonly snaps: MementoOriginator<SnapMemento>
    ) { }

    group(registry: Map<any, any>, fn: () => void) {
        const memento = new Memento(
            this.version++,
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
                    this.version++,
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

    restore(memento: Memento) {
        this.originator.restoreFromMemento(memento);
    }
}
