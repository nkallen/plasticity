import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { ProxyCamera } from '../components/viewport/ProxyCamera';
import { RefCounter } from '../util/Util';
import * as visual from "../visual_model/VisualModel";
import ContourManager, { CurveInfo } from './curves/ContourManager';
import { CrossPoint } from './curves/CrossPointDatabase';
import { ControlPointData, TopologyData } from "./DatabaseLike";
import { EditorSignals } from './EditorSignals';
import { Nodes } from "./Nodes";
import { PointSnap } from "./snaps/Snap";
import { DisablableType } from "./TypeManager";

export class Memento {
    constructor(
        readonly version: number,
        readonly db: GeometryMemento,
        readonly nodes: NodeMemento,
        readonly materials: MaterialMemento,
        readonly selection: SelectionMemento,
        readonly snaps: SnapMemento,
        readonly crosses: CrossPointMemento,
        readonly curves: CurveMemento,
    ) { }
}

export class GeometryMemento {
    constructor(
        readonly geometryModel: ReadonlyMap<c3d.SimpleName, { view: visual.Item, model: c3d.Item }>,
        readonly version2name: ReadonlyMap<c3d.SimpleName, c3d.SimpleName>,
        readonly topologyModel: ReadonlyMap<string, TopologyData>,
        readonly controlPointModel: ReadonlyMap<string, ControlPointData>,
        readonly automatics: ReadonlySet<c3d.SimpleName>,
    ) { }

    async serialize(): Promise<Buffer> {
        const { memory } = await c3d.Writer.WriteItems_async(this.model);
        return memory;
    }

    get model(): c3d.Model {
        const { geometryModel } = this;

        const everything = new c3d.Model();
        for (const [id, { model }] of geometryModel.entries()) {
            if (this.automatics.has(id)) continue;
            everything.AddItem(model, id);
        }
        return everything;
    }
}

export class NodeMemento {
    constructor(
        readonly name2material: ReadonlyMap<c3d.SimpleName, number>,
        readonly hidden: ReadonlySet<c3d.SimpleName>,
        readonly invisible: ReadonlySet<c3d.SimpleName>,
    ) { }
}

export class MaterialMemento {
    constructor(
        readonly materials: ReadonlyMap<number, { name: string, material: THREE.MeshPhysicalMaterial }>
    ) { }
}

// FIXME: make ReadonlyRefCounter

export class SelectionMemento {
    constructor(
        readonly selectedSolidIds: ReadonlySet<c3d.SimpleName>,
        readonly parentsWithSelectedChildren: RefCounter<c3d.SimpleName>,
        readonly selectedEdgeIds: ReadonlySet<string>,
        readonly selectedFaceIds: ReadonlySet<string>,
        readonly selectedCurveIds: ReadonlySet<c3d.SimpleName>,
        readonly selectedRegionIds: ReadonlySet<c3d.SimpleName>,
        readonly selectedControlPointIds: ReadonlySet<string>,
    ) { }
}

export class CameraMemento {
    constructor(
        readonly mode: ProxyCamera["mode"],
        readonly position: Readonly<THREE.Vector3>,
        readonly quaternion: Readonly<THREE.Quaternion>,
        readonly zoom: number
    ) { }
}

export class ConstructionPlaneMemento {
    constructor(
        readonly n: Readonly<THREE.Vector3>,
        readonly o: Readonly<THREE.Vector3>
    ) { }
}

export class ViewportMemento {
    constructor(
        readonly camera: CameraMemento,
        readonly target: Readonly<THREE.Vector3>,
        readonly isXRay: boolean,
        readonly constructionPlane: ConstructionPlaneMemento,
    ) { }
}

export class SnapMemento {
    constructor(
        readonly id2snaps: ReadonlyMap<DisablableType, ReadonlyMap<c3d.SimpleName, Set<PointSnap>>>,
        readonly hidden: ReadonlyMap<c3d.SimpleName, Set<PointSnap>>
    ) { }
}

export class CrossPointMemento {
    constructor(
        readonly curve2touched: ReadonlyMap<c3d.SimpleName, Set<c3d.SimpleName>>,
        readonly id2cross: ReadonlyMap<c3d.SimpleName, Set<CrossPoint>>,
        readonly id2curve: ReadonlyMap<c3d.SimpleName, c3d.Curve3D>,
        readonly crosses: ReadonlySet<CrossPoint>,
    ) { }
}

export class CurveMemento {
    constructor(
        readonly curve2info: ReadonlyMap<c3d.SimpleName, CurveInfo>,
        readonly id2planarCurve: ReadonlyMap<c3d.SimpleName, c3d.Curve>,
        readonly placements: ReadonlySet<c3d.Placement3D>,
    ) { }
}

export type StateChange = (f: () => void) => void;

type OriginatorState = { tag: 'start' } | { tag: 'group', memento: Memento }

export class EditorOriginator {
    private state: OriginatorState = { tag: 'start' }
    private version = 0;

    constructor(
        readonly db: MementoOriginator<GeometryMemento> & Serializble & { get nodes(): Nodes },
        readonly materials: MementoOriginator<MaterialMemento>,
        readonly selection: MementoOriginator<SelectionMemento>,
        readonly snaps: MementoOriginator<SnapMemento>,
        readonly crosses: MementoOriginator<CrossPointMemento>,
        readonly curves: MementoOriginator<CurveMemento>,
        readonly contours: ContourManager,
        readonly viewports: MementoOriginator<ViewportMemento>[],
    ) { }

    group(fn: () => void) {
        const memento = new Memento(
            this.version++,
            this.db.saveToMemento(),
            this.db.nodes.saveToMemento(),
            this.materials.saveToMemento(),
            this.selection.saveToMemento(),
            this.snaps.saveToMemento(),
            this.crosses.saveToMemento(),
            this.curves.saveToMemento());

        this.state = { tag: 'group', memento: memento };
        try { fn() }
        finally {
            this.state = { tag: 'start' };
        }
    }

    saveToMemento(): Memento {
        switch (this.state.tag) {
            case 'start':
                return new Memento(
                    this.version++,
                    this.db.saveToMemento(),
                    this.db.nodes.saveToMemento(),
                    this.materials.saveToMemento(),
                    this.selection.saveToMemento(),
                    this.snaps.saveToMemento(),
                    this.crosses.saveToMemento(),
                    this.curves.saveToMemento());
            case 'group':
                return this.state.memento;
        }
    }

    restoreFromMemento(m: Memento) {
        OrderIsImportant: {
            this.db.restoreFromMemento(m.db);
            this.db.nodes.restoreFromMemento(m.nodes);
            this.selection.restoreFromMemento(m.selection);
            this.crosses.restoreFromMemento(m.crosses);
            this.snaps.restoreFromMemento(m.snaps);
            this.curves.restoreFromMemento(m.curves);
        }
    }

    discardSideEffects(m: Memento) {
        if (this.version === m.version) {
            this.restoreFromMemento(m);
        }
    }

    validate() {
        this.snaps.validate();
        this.crosses.validate();
        this.selection.validate();
        this.curves.validate();
        this.db.validate();
    }

    debug() {
        console.groupCollapsed("Debug")
        console.info("Version: ", this.version);
        this.snaps.debug();
        this.selection.debug();
        this.curves.debug();
        this.crosses.debug();
        this.db.debug();
        console.groupEnd();
    }
}

export interface MementoOriginator<T> {
    saveToMemento(): T;
    restoreFromMemento(m: T): void;
    validate(): void;
    debug(): void;
}

export interface Serializble {
    serialize(): Promise<Buffer>;
    deserialize(data: Buffer): Promise<visual.Item[]>;
}

type HistoryStackItem = {
    name: String,
    before: Memento,
    after: Memento,
}
export class History {
    private readonly _undoStack: HistoryStackItem[] = [];
    get undoStack(): readonly HistoryStackItem[] { return this._undoStack }

    private readonly _redoStack: HistoryStackItem[] = [];
    get redoStack(): readonly HistoryStackItem[] { return this._redoStack }

    constructor(
        private readonly originator: EditorOriginator,
        private readonly signals: EditorSignals
    ) { }

    get current() {
        if (this.undoStack.length === 0) return this.originator.saveToMemento();
        else return this.undoStack[this.undoStack.length - 1].after;
    }

    add(name: String, before: Memento) {
        if (this._undoStack.length > 0 &&
            this._undoStack[this._undoStack.length - 1].before === before) return;
        const after = this.originator.saveToMemento();
        const item = { name, before, after };
        this._undoStack.push(item);
        this._redoStack.length = 0;
        this.signals.historyAdded.dispatch();
    }

    undo(): boolean {
        const undo = this._undoStack.pop();
        if (!undo) return false;

        const { before } = undo;
        this.originator.restoreFromMemento(before);
        this._redoStack.push(undo);

        this.signals.historyChanged.dispatch();
        return true;
    }

    redo(): boolean {
        const redo = this._redoStack.pop();
        if (redo === undefined) return false;

        const { after } = redo;
        this.originator.restoreFromMemento(after);
        this._undoStack.push(redo);
        this.signals.historyChanged.dispatch();

        return true;
    }

    restore(memento: Memento) {
        this.originator.restoreFromMemento(memento);
    }
}
