import * as THREE from "three";
import { ProxyCamera } from '../components/viewport/ProxyCamera';
import * as c3d from '../kernel/kernel';
import { RefCounter } from '../util/Util';
import * as visual from "../visual_model/VisualModel";
import ContourManager from './curves/ContourManager';
import { CrossPoint } from './curves/CrossPointDatabase';
import { CurveInfo } from "./curves/PlanarCurveDatabase";
import { ControlPointData, TopologyData } from "./DatabaseLike";
import { EditorSignals } from './EditorSignals';
import { Empty, EmptyId, EmptyInfo } from "./Empties";
import { Images } from "./Images";
import { GroupId } from "./Groups";
import { NodeKey, Transform } from "./Nodes";
import { EmptyJSON } from "./PlasticityDocument";
import { PointSnap } from "./snaps/PointSnap";
import { DisablableType } from "./TypeManager";

export class Memento {
    constructor(
        readonly version: number,
        readonly db: GeometryMemento,
        readonly empties: EmptyMemento,
        readonly scene: SceneMemento,
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
        readonly version2id: ReadonlyMap<c3d.SimpleName, c3d.SimpleName>,
        readonly id2version: ReadonlyMap<c3d.SimpleName, c3d.SimpleName>,
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
        readonly node2material: ReadonlyMap<NodeKey, number>,
        readonly hidden: ReadonlySet<NodeKey>,
        readonly invisible: ReadonlySet<NodeKey>,
        readonly unselectable: ReadonlySet<NodeKey>,
        readonly node2name: ReadonlyMap<NodeKey, string>,
        readonly node2transform: ReadonlyMap<NodeKey, Transform>,
    ) { }
}

export class GroupMemento {
    constructor(
        readonly counter: number,
        readonly member2parent: ReadonlyMap<NodeKey, GroupId>,
        readonly group2children: ReadonlyMap<GroupId, ReadonlySet<NodeKey>>,
    ) { }
}

export class SceneMemento {
    constructor(
        readonly cwd: GroupId,
        readonly nodes: NodeMemento,
        readonly groups: GroupMemento,
    ) { }
}

export class EmptyMemento {
    constructor(
        readonly id2info: ReadonlyMap<EmptyId, Readonly<EmptyInfo>>,
        readonly id2empty: ReadonlyMap<EmptyId, Empty>,
    ) { }
}

export class MaterialMemento {
    constructor(
        readonly counter: number,
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
        readonly selectedGroupIds: ReadonlySet<GroupId>,
        readonly selectedEmptyIds: ReadonlySet<EmptyId>,
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
        readonly id2snaps: ReadonlyMap<DisablableType, ReadonlyMap<c3d.SimpleName, ReadonlySet<PointSnap>>>,
        readonly hidden: ReadonlyMap<c3d.SimpleName, ReadonlySet<PointSnap>>
    ) { }
}

export class CrossPointMemento {
    constructor(
        readonly curve2touched: ReadonlyMap<c3d.SimpleName, ReadonlySet<c3d.SimpleName>>,
        readonly id2cross: ReadonlyMap<c3d.SimpleName, ReadonlySet<CrossPoint>>,
        readonly id2curve: ReadonlyMap<c3d.SimpleName, c3d.Curve3D>,
        readonly crosses: ReadonlySet<CrossPoint>,
    ) { }
}

export class CurveMemento {
    constructor(
        readonly curve2info: ReadonlyMap<c3d.SimpleName, CurveInfo>,
        readonly placements: ReadonlySet<c3d.Placement3D>,
    ) { }
}

export type StateChange = (f: () => void) => void;

type OriginatorState = { tag: 'start' } | { tag: 'group', memento: Memento }

export class EditorOriginator {
    private state: OriginatorState = { tag: 'start' }
    private version = 0;

    constructor(
        readonly db: MementoOriginator<GeometryMemento> & Serializable,
        readonly empties: MementoOriginator<EmptyMemento> & { deserialize(foo: EmptyJSON[]): void},
        readonly scene: MementoOriginator<SceneMemento>,
        readonly materials: MementoOriginator<MaterialMemento>,
        readonly selection: MementoOriginator<SelectionMemento>,
        readonly snaps: MementoOriginator<SnapMemento>,
        readonly crosses: MementoOriginator<CrossPointMemento>,
        readonly curves: MementoOriginator<CurveMemento>,
        readonly contours: ContourManager,
        readonly viewports: MementoOriginator<ViewportMemento>[],
        readonly images: Images,
    ) { }

    saveToMemento(): Memento {
        switch (this.state.tag) {
            case 'start':
                return new Memento(
                    this.version++,
                    this.db.saveToMemento(),
                    this.empties.saveToMemento(),
                    this.scene.saveToMemento(),
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
            this.empties.restoreFromMemento(m.empties);
            this.scene.restoreFromMemento(m.scene);
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
        this.scene.validate();
    }

    debug() {
        console.groupCollapsed("Debug")
        console.info("Version: ", this.version);
        this.snaps.debug();
        this.selection.debug();
        this.curves.debug();
        this.crosses.debug();
        this.db.debug();
        this.scene.debug();
        console.groupEnd();
    }
}

export interface MementoOriginator<T> {
    saveToMemento(): T;
    restoreFromMemento(m: T): void;
    validate(): void;
    debug(): void;
}

export interface Serializable {
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
