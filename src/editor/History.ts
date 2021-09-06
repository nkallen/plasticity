import c3d from '../../build/Release/c3d.node';
import { SymmetryFactory } from '../commands/mirror/MirrorFactory';
import { RefCounter } from '../util/Util';
import { EditorSignals } from './EditorSignals';
import { DatabaseLike, GeometryDatabase } from './GeometryDatabase';
import MaterialDatabase from './MaterialDatabase';
import ModifierManager, { ModifierStack } from './ModifierManager';
import { PlanarCurveDatabase } from "./PlanarCurveDatabase";
import { CurveEdgeSnap, CurveSnap, FaceSnap, PointSnap } from './SnapManager';
import * as visual from "./VisualModel";

export class Memento {
    constructor(
        readonly version: number,
        readonly db: GeometryMemento,
        readonly selection: SelectionMemento,
        readonly snaps: SnapMemento,
        readonly contours: CurveMemento,
        readonly modifiers: ModifierMemento,
    ) { }
}

export class GeometryMemento {
    constructor(
        readonly geometryModel: GeometryDatabase["geometryModel"],
        readonly topologyModel: GeometryDatabase["topologyModel"],
        readonly controlPointModel: GeometryDatabase["controlPointModel"],
        readonly hidden: Set<c3d.SimpleName>
    ) { }

    async serialize(): Promise<Buffer> {
        const { geometryModel } = this;
        const everything = new c3d.Model();
        for (const [id, { model }] of geometryModel.entries()) {
            if (model.IsA() !== c3d.SpaceType.Solid) continue;
            everything.AddItem(model, id);
        }
        const { memory } = await c3d.Writer.WriteItems_async(everything);
        return memory;
    }
}

export class SelectionMemento {
    constructor(
        readonly selectedSolidIds: Set<c3d.SimpleName>,
        readonly parentsWithSelectedChildren: RefCounter<c3d.SimpleName>,
        readonly selectedEdgeIds: Set<string>,
        readonly selectedFaceIds: Set<string>,
        readonly selectedCurveIds: Set<c3d.SimpleName>,
        readonly selectedRegionIds: Set<c3d.SimpleName>,
        readonly selectedControlPointIds: Set<string>,
    ) { }
}

export class SnapMemento {
    constructor(
        readonly garbageDisposal: RefCounter<c3d.SimpleName>,
        readonly faces: Set<FaceSnap>,
        readonly edges: Set<CurveEdgeSnap>,
        readonly curves: Set<CurveSnap>,
        readonly begPoints: Set<PointSnap>,
        readonly midPoints: Set<PointSnap>,
        readonly endPoints: Set<PointSnap>,
        readonly centerPoints: Set<PointSnap>,
    ) { }
}

export class CurveMemento {
    constructor(
        readonly curve2info: PlanarCurveDatabase["curve2info"],
        readonly planar2instance: PlanarCurveDatabase["planar2instance"],
        readonly placements: PlanarCurveDatabase["placements"],
    ) { }
}

export class ModifierMemento {
    constructor(
        readonly name2stack: ModifierManager['name2stack'],
        readonly version2name: ModifierManager['version2name'],
        readonly modified2name: ModifierManager['modified2name'],
    ) { }

    serialize(): Buffer {
        const string = JSON.stringify({
            version2name: this.version2name,
            modified2name: this.modified2name,
            name2stack: this.name2stack,
        }, this.replacer);
        return Buffer.from(string);
    }

    static deserialize(data: Buffer, db: DatabaseLike, materials: MaterialDatabase, signals: EditorSignals): ModifierMemento {
        const p = JSON.parse(data.toString(), (key, value) => this.reviver(db, materials, signals)(key, value));
        return new ModifierMemento(
            p.name2stack,
            p.version2name,
            p.modified2name,
        );
    }

    replacer(key: string, value: any) {
        switch (key) {
            case 'version2name':
            case 'modified2name':
                return {
                    dataType: 'Map<c3d.SimpleName, c3d.SimpleName>',
                    value: [...value],
                };
            case 'name2stack':
                const cast = value as Map<c3d.SimpleName, ModifierStack>;
                return {
                    dataType: 'Map<c3d.SimpleName, ModifierStack>',
                    value: [...cast.entries()].map(([key, value]) => [key, value.toJSON()]),
                };
            default: return value;
        }
    }

    static reviver(db: DatabaseLike, materials: MaterialDatabase, signals: EditorSignals) {
        return (key: string, value: any) => {
            switch (key) {
                case 'version2name':
                case 'modified2name':
                    return new Map(value.value);
                case 'name2stack':
                    const cast = value.value as [c3d.SimpleName, any][];
                    return new Map(cast.map(([name, json]) => {
                        const stack = ModifierStack.fromJSON(json, db, materials, signals);
                        return [name, stack]
                    }));
                default: return value;
            }
        }
    }
}

export class ModifierStackMemento {
    constructor(
        readonly premodified: ModifierStack['premodified'],
        readonly modified: ModifierStack['modified'],
        readonly modifiers: ModifierStack['modifiers'],
    ) { }

    toJSON() {
        return {
            premodified: this.premodified.simpleName,
            modified: this.modified.simpleName,
            modifiers: this.modifiers.map(m => m.toJSON())
        }
    }

    static fromJSON(json: any, db: DatabaseLike, materials: MaterialDatabase, signals: EditorSignals): ModifierStackMemento {
        const premodified = db.lookupItemById(json.premodified).view as visual.Solid;
        const modified = db.lookupItemById(json.modified).view as visual.Solid;
        const modifiers = [];
        for (const modifier of json.modifiers) {
            const factory = new SymmetryFactory(db, materials, signals);
            factory.fromJSON(modifier.params);
            modifiers.push(factory);
        }
        return new ModifierStackMemento(premodified, modified, modifiers);
    }
}

export type StateChange = (f: () => void) => void;

type OriginatorState = { tag: 'start' } | { tag: 'group', memento: Memento }
export class EditorOriginator {
    private state: OriginatorState = { tag: 'start' }
    private version = 0;

    constructor(
        readonly db: MementoOriginator<GeometryMemento>,
        readonly selection: MementoOriginator<SelectionMemento>,
        readonly snaps: MementoOriginator<SnapMemento>,
        readonly contours: MementoOriginator<CurveMemento>,
        readonly modifiers: MementoOriginator<ModifierMemento>,
    ) { }

    group(fn: () => void) {
        const memento = new Memento(
            this.version++,
            this.db.saveToMemento(),
            this.selection.saveToMemento(),
            this.snaps.saveToMemento(),
            this.contours.saveToMemento(),
            this.modifiers.saveToMemento());

        this.state = { tag: 'group', memento: memento };
        try {
            fn();
        } finally {
            this.state = { tag: 'start' };
        }
    }

    saveToMemento(): Memento {
        switch (this.state.tag) {
            case 'start':
                return new Memento(
                    this.version++,
                    this.db.saveToMemento(),
                    this.selection.saveToMemento(),
                    this.snaps.saveToMemento(),
                    this.contours.saveToMemento(),
                    this.modifiers.saveToMemento());
            case 'group':
                return this.state.memento;
        }
    }

    restoreFromMemento(m: Memento) {
        this.db.restoreFromMemento(m.db);
        this.modifiers.restoreFromMemento(m.modifiers);
        this.selection.restoreFromMemento(m.selection);
        this.snaps.restoreFromMemento(m.snaps);
        this.contours.restoreFromMemento(m.contours);
    }

    async serialize(): Promise<Buffer> {
        const db = await this.db.serialize();
        const modifiers = await this.modifiers.serialize();
        const result = Buffer.alloc(8 + db.length + 8 + modifiers.length);
        result.writeBigUInt64BE(BigInt(db.length));
        db.copy(result, 8);
        result.writeBigUInt64BE(BigInt(modifiers.length), 8 + db.length);
        modifiers.copy(result, 8 + db.length + 8);
        return result;
    }

    async deserialize(data: Buffer): Promise<void> {
        const db = Number(data.readBigUInt64BE());
        await this.db.deserialize(data.slice(8, 8 + db));
        const modifiers = Number(data.readBigUInt64BE(db + 8));
        await this.modifiers.deserialize(data.slice(8 + db + 8, 8 + db + 8 + modifiers))
    }

    validate() {
        this.modifiers.validate();
        this.snaps.validate();
        this.selection.validate();
        this.contours.validate();
        this.db.validate();
    }

    debug() {
        console.groupCollapsed("Debug")
        console.info("Version: ", this.version);
        this.modifiers.debug();
        this.snaps.debug();
        this.selection.debug();
        this.contours.debug();
        this.db.debug();
        console.groupEnd();
    }
}

export interface MementoOriginator<T> {
    saveToMemento(): T;
    restoreFromMemento(m: T): void;
    serialize(): Promise<Buffer>;
    deserialize(data: Buffer): Promise<void>;
    validate(): void;
    debug(): void;
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
