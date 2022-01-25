import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { SymmetryFactory } from '../commands/mirror/MirrorFactory';
import { ProxyCamera } from '../components/viewport/ProxyCamera';
import { RefCounter } from '../util/Util';
import * as visual from "../visual_model/VisualModel";
import ContourManager from './curves/ContourManager';
import { CrossPoint } from './curves/CrossPointDatabase';
import { PlanarCurveDatabase } from "./curves/PlanarCurveDatabase";
import { EditorSignals } from './EditorSignals';
import { GeometryDatabase } from './GeometryDatabase';
import { DatabaseLike } from "./DatabaseLike";
import MaterialDatabase from './MaterialDatabase';
import ModifierManager, { ModifierStack } from './ModifierManager';
import { PointSnap } from "./snaps/Snap";

export class Memento {
    constructor(
        readonly version: number,
        readonly db: GeometryMemento,
        readonly selection: SelectionMemento,
        readonly snaps: SnapMemento,
        readonly crosses: CrossPointMemento,
        readonly curves: CurveMemento,
        readonly modifiers: ModifierMemento,
    ) { }
}

export class GeometryMemento {
    constructor(
        readonly geometryModel: GeometryDatabase["geometryModel"],
        readonly topologyModel: GeometryDatabase["topologyModel"],
        readonly controlPointModel: GeometryDatabase["controlPointModel"],
        readonly hidden: Set<c3d.SimpleName>,
        readonly automatics: GeometryDatabase["automatics"],
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

export class CameraMemento {
    constructor(
        readonly mode: ProxyCamera["mode"],
        readonly position: THREE.Vector3,
        readonly quaternion: THREE.Quaternion,
        readonly zoom: number,
        readonly offsetWidth: number,
        readonly offsetHeight: number,
    ) { }

    toJSON() {
        return JSON.stringify({
            mode: this.mode,
            position: this.position.toArray(),
            quaternion: this.quaternion.toArray(),
            zoom: this.zoom,
            offsetWidth: this.offsetWidth,
            offsetHeight: this.offsetHeight
        });
    }

    static fromJSON(data: string): CameraMemento {
        const p = JSON.parse(data);
        const { mode, zoom, offsetWidth, offsetHeight } = p;
        const position = new THREE.Vector3().fromArray(p.position);
        const quaternion = new THREE.Quaternion().fromArray(p.quaternion);
        return new CameraMemento(mode, position, quaternion, zoom, offsetWidth, offsetHeight);
    }
}

export class ConstructionPlaneMemento {
    constructor(
        readonly n: THREE.Vector3,
        readonly o: THREE.Vector3
    ) { }

    toJSON() {
        return JSON.stringify({
            n: this.n.toArray(),
            o: this.o.toArray(),
        });
    }

    static fromJSON(data: string): ConstructionPlaneMemento {
        const p = JSON.parse(data);
        const n = new THREE.Vector3().fromArray(p.n);
        const o = new THREE.Vector3().fromArray(p.o);
        return new ConstructionPlaneMemento(n, o);
    }
}

export class ViewportMemento {
    constructor(
        readonly camera: CameraMemento,
        readonly target: THREE.Vector3,
        readonly isXRay: boolean,
        readonly constructionPlane: ConstructionPlaneMemento,
    ) { }

    serialize(): Buffer {
        const string = JSON.stringify({
            camera: this.camera.toJSON(),
            target: this.target.toArray(),
            constructionPlane: this.constructionPlane.toJSON(),
            isXRay: this.isXRay,
        });
        return Buffer.from(string);
    }

    static deserialize(data: Buffer): ViewportMemento {
        const p = JSON.parse(data.toString());
        const camera = CameraMemento.fromJSON(p.camera);
        const target = new THREE.Vector3().fromArray(p.target);
        const constructionPlane = ConstructionPlaneMemento.fromJSON(p.constructionPlane);
        return new ViewportMemento(camera, target, p.isXRay, constructionPlane);
    }
}

export class SnapMemento {
    constructor(
        readonly id2snaps: Map<c3d.SimpleName, Set<PointSnap>>,
        readonly hidden: Map<c3d.SimpleName, Set<PointSnap>>
    ) { }
}

export class CrossPointMemento {
    constructor(
        readonly curve2touched: Map<c3d.SimpleName, Set<c3d.SimpleName>>,
        readonly id2cross: Map<c3d.SimpleName, Set<CrossPoint>>,
        readonly id2curve: Map<c3d.SimpleName, c3d.Curve3D>,
        readonly crosses: Set<CrossPoint>,
    ) { }
}

export class CurveMemento {
    constructor(
        readonly curve2info: PlanarCurveDatabase["curve2info"],
        readonly id2planarCurve: PlanarCurveDatabase["id2planarCurve"],
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
        readonly crosses: MementoOriginator<CrossPointMemento>,
        readonly curves: MementoOriginator<CurveMemento>,
        readonly contours: ContourManager,
        readonly modifiers: MementoOriginator<ModifierMemento>,
        readonly viewports: MementoOriginator<ViewportMemento>[],
    ) { }

    group(fn: () => void) {
        const memento = new Memento(
            this.version++,
            this.db.saveToMemento(),
            this.selection.saveToMemento(),
            this.snaps.saveToMemento(),
            this.crosses.saveToMemento(),
            this.curves.saveToMemento(),
            this.modifiers.saveToMemento());

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
                    this.selection.saveToMemento(),
                    this.snaps.saveToMemento(),
                    this.crosses.saveToMemento(),
                    this.curves.saveToMemento(),
                    this.modifiers.saveToMemento());
            case 'group':
                return this.state.memento;
        }
    }

    restoreFromMemento(m: Memento) {
        OrderIsImportant: {
            this.db.restoreFromMemento(m.db);
            this.modifiers.restoreFromMemento(m.modifiers);
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

    async serialize(): Promise<Buffer> {
        const db = await this.db.serialize();
        const modifiers = await this.modifiers.serialize();
        const numViewports = this.viewports.length;
        const viewports = await Promise.all(this.viewports.map(v => v.serialize()));
        const viewportsLength = viewports.reduce((acc: number, x: Buffer) => acc + x.length, 0);
        const result = Buffer.alloc(8 + db.length + 8 + modifiers.length + 8 + 8 * numViewports + viewportsLength);
        let pos = 0;
        result.writeBigUInt64BE(BigInt(db.length));
        pos += 8;
        db.copy(result, pos);
        pos += db.length;
        result.writeBigUInt64BE(BigInt(modifiers.length), pos);
        pos += 8;
        modifiers.copy(result, pos);
        pos += modifiers.length;
        result.writeBigUInt64BE(BigInt(viewports.length), pos);
        pos += 8;
        for (let i = 0; i < viewports.length; i++) {
            const viewport = viewports[i];
            result.writeBigUInt64BE(BigInt(viewport.length), pos);
            pos += 8;
            viewport.copy(result, pos);
            pos += viewport.length;
        }
        return result;
    }

    async deserialize(data: Buffer): Promise<void> {
        let pos = 0;
        const dbSize = Number(data.readBigUInt64BE());
        pos += 8;
        const dbData = data.slice(pos, pos + dbSize);
        pos += dbSize;
        const modifiersSize = Number(data.readBigUInt64BE(pos));
        pos += 8;
        const modifiersData = data.slice(pos, pos + modifiersSize);
        pos += modifiersSize;
        const numViewports = Number(data.readBigUInt64BE(pos));
        pos += 8;
        for (let i = 0; i < numViewports; i++) {
            const viewportSize = Number(data.readBigUInt64BE(pos));
            pos += 8;
            const viewportData = data.slice(pos, pos + viewportSize);
            await this.viewports[i].deserialize(viewportData);
            pos += viewportSize;
        }

        await this.db.deserialize(dbData);
        await this.modifiers.deserialize(modifiersData);
        await this.contours.rebuild();
    }

    validate() {
        this.modifiers.validate();
        this.snaps.validate();
        this.crosses.validate();
        this.selection.validate();
        this.curves.validate();
        this.db.validate();
    }

    debug() {
        console.groupCollapsed("Debug")
        console.info("Version: ", this.version);
        this.modifiers.debug();
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
    serialize(): Promise<Buffer>;
    deserialize(data: Buffer): Promise<void>;
    validate(): void;
    debug(): void;
}

export class History {
    private readonly _undoStack: [String, Memento][] = [];
    get undoStack(): readonly [String, Memento][] { return this._undoStack }

    private readonly _redoStack: [String, Memento][] = [];
    get redoStack(): readonly [String, Memento][] { return this._redoStack }

    constructor(
        private readonly originator: EditorOriginator,
        private readonly signals: EditorSignals
    ) { }

    add(name: String, state: Memento) {
        if (this._undoStack.length > 0 &&
            this._undoStack[this._undoStack.length - 1][1] === state) return;
        this._undoStack.push([name, state]);
        this._redoStack.length = 0;
        this.signals.historyAdded.dispatch();
    }

    undo(): boolean {
        const undo = this._undoStack.pop();
        if (!undo) return false;

        const [, memento] = undo;
        this.originator.restoreFromMemento(memento);
        this._redoStack.push(undo);

        this.signals.historyChanged.dispatch();
        return true;
    }

    redo(): boolean {
        const redo = this._redoStack.pop();
        if (redo === undefined) return false;

        const [, memento] = redo;
        this.originator.restoreFromMemento(memento);
        this._undoStack.push(redo);
        this.signals.historyChanged.dispatch();

        return true;
    }

    restore(memento: Memento) {
        this.originator.restoreFromMemento(memento);
    }
}
