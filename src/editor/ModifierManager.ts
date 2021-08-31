import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { SymmetryFactory } from "../commands/mirror/MirrorFactory";
import { HighlightManager } from "../selection/HighlightManager";
import { ItemSelection } from "../selection/Selection";
import { HasSelectedAndHovered, Outlinable, ModifiesSelection } from "../selection/SelectionManager";
import { SelectionProxy } from "../selection/SelectionProxy";
import { GConstructor } from "../util/Util";
import { DatabaseProxy } from "./DatabaseProxy";
import { EditorSignals } from "./EditorSignals";
import { Agent, DatabaseLike, GeometryDatabase, TemporaryObject } from "./GeometryDatabase";
import { MementoOriginator, ModifierMemento, ModifierStackMemento } from "./History";
import MaterialDatabase from "./MaterialDatabase";
import * as visual from "./VisualModel";

export type Replacement = { from: visual.Item, to: visual.Item }

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

/**
 * Modifiers are a "stack" of post-processing operations on an object, e.g., a symmetrize that will
 * automatically run after every operation.
 * 
 * Important vocabulary: "unmodified" -- a normal object with no modifier stack; "premodified" --
 * an object with a modifier stack, but before the modifiers have been run; "modified" -- an object
 * with a modifier stack fully executed.
 */

export class ModifierStack {
    isEnabled = true;
    showWhileEditing = true;

    private _modified!: visual.Solid;
    private _premodified!: visual.Solid;
    readonly modifiers: SymmetryFactory[] = [];

    constructor(
        private readonly db: DatabaseLike,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals,
    ) { }

    get premodified() { return this._premodified }
    get modified() { return this._modified }

    add(view: visual.Solid): visual.Solid {
        this._modified = view;
        this._premodified = view;
        return view;
    }

    async update(underlying: c3d.Solid, view: Promise<visual.Solid>): Promise<visual.Solid> {
        const { premodified, modified } = await this.calculate(underlying, view);
        this._modified = modified;
        this._premodified = premodified;
        return modified;
    }

    addModifier(klass: GConstructor<SymmetryFactory>) {
        const factory = new klass(this.db, this.materials, this.signals);
        this.modifiers.push(factory);
        return factory;
    }

    removeModifier(index: number) {
        if (index >= this.modifiers.length) throw new Error("invalid precondition");
        this.modifiers.splice(index, 1);
    }

    async rebuild() {
        const { db, premodified } = this;
        return this.update(db.lookup(premodified), Promise.resolve(premodified));
    }

    private async calculate(model: c3d.Solid, view: Promise<visual.Solid>): Promise<{ premodified: visual.Solid, modified: visual.Solid }> {
        const { modifiers } = this;
        if (modifiers.length === 0) {
            const completed = await view;
            return { premodified: completed, modified: completed }
        }

        const symmetry = modifiers[0] as SymmetryFactory;
        symmetry.solid = model;
        const symmetrized = await symmetry.calculate();

        const modified = (this._modified === this._premodified) ?
            await this.db.addItem(symmetrized, 'automatic') :
            await this.db.replaceItem(this._modified, symmetrized);

        const premodified = await view;
        premodified.visible = false;
        
        return { premodified, modified };
    }

    async updateTemporary(from: visual.Item, underlying: c3d.Solid): Promise<TemporaryObject> {
        const symmetry = this.modifiers[0] as SymmetryFactory;
        symmetry.solid = underlying;
        const symmetrized = await symmetry.doUpdate();

        if (symmetrized.length != 1) throw new Error("invalid postcondition: " + symmetrized.length);
        const temp = symmetrized[0];
        const { modified, premodified } = this;
        return {
            underlying: temp.underlying,
            show() {
                temp.show();
                modified.visible = false;
            },
            cancel() {
                temp.cancel();
                modified.visible = true;
                premodified.visible = false;
            }
        }
    }

    dispose() {
        const { modified, premodified, materials, db } = this;
        if (modified !== premodified) {
            this.db.removeItem(modified);
            for (const face of premodified.allFaces) {
                face.traverse(child => {
                    if (child instanceof THREE.Mesh) {
                        child.material = materials.mesh();
                    }
                });
            }
        }
    }

    saveToMemento(): ModifierStackMemento {
        return new ModifierStackMemento(
            this.premodified,
            this.modified,
            [...this.modifiers],
        )
    }

    restoreFromMemento(m: ModifierStackMemento) {
        this._premodified = m.premodified;
        this._modified = m.modified;
        (this.modifiers as ModifierStack['modifiers']) = m.modifiers;
    }

    toJSON() {
        return this.saveToMemento().toJSON();
    }

    fromJSON(json: any) {
        this.restoreFromMemento(ModifierStackMemento.fromJSON(json, this.db, this.materials, this.signals));
        this.premodified.visible = false;
    }
}

const invisible = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
});

export default class ModifierManager extends DatabaseProxy implements HasSelectedAndHovered, MementoOriginator<ModifierMemento> {
    protected readonly name2stack = new Map<c3d.SimpleName, ModifierStack>();
    protected readonly version2name = new Map<c3d.SimpleName, c3d.SimpleName>();
    protected readonly modified2name = new Map<c3d.SimpleName, c3d.SimpleName>();

    readonly selected: ModifierSelection;
    readonly hovered: ModifiesSelection & Outlinable;

    constructor(
        db: GeometryDatabase,
        protected readonly selection: HasSelectedAndHovered,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) {
        super(db);
        this.selected = new ModifierSelection(db, this, selection.selected);
        this.hovered = selection.hovered;
    }

    add(object: visual.Solid): ModifierStack {
        const { version2name, name2stack: map, db, materials, signals } = this;
        let name = version2name.get(object.simpleName);
        if (name === undefined) {
            // FIXME this is TEMPORARY just for reloading files. replace when there is a better file reload strategy
            version2name.set(object.simpleName, object.simpleName);
            name = object.simpleName;
        }

        const modifiers = new ModifierStack(db, materials, signals);
        map.set(name, modifiers);

        modifiers.add(object);
        return modifiers;
    }

    async remove(object: visual.Solid) {
        const { version2name, modified2name, name2stack: map } = this;
        const stack = this.getByPremodified(object);
        if (stack === undefined) throw new Error("invalid precondition");
        modified2name.delete(stack.modified.simpleName);
        stack.dispose();

        map.delete(version2name.get(object.simpleName)!);
    }

    async rebuild(stack: ModifierStack) {
        const { modified2name, name2stack: map } = this;
        if (stack.modifiers.length === 0) {
            const name = modified2name.get(stack.modified.simpleName);
            if (name === undefined) throw new Error("invalid precondition");
            map.delete(name);
            modified2name.delete(stack.modified.simpleName);
            stack.dispose();
        } else {
            const modified = await stack.rebuild();
            modified2name.set(modified.simpleName, stack.premodified.simpleName);
        }
    }

    async apply(stack: ModifierStack) {
        const { version2name, modified2name, name2stack: map } = this;
        modified2name.delete(stack.modified.simpleName);
        map.delete(version2name.get(stack.premodified.simpleName)!);
        this.db.removeItem(stack.premodified);
        ModifierSelection.showModified(stack);
        return stack.modified;
    }

    getByPremodified(object: visual.Solid | c3d.SimpleName): ModifierStack | undefined {
        const { version2name, name2stack } = this;
        const simpleName = object instanceof visual.Solid ? object.simpleName : object;
        let name = version2name.get(simpleName);
        if (name === undefined) return undefined;

        return name2stack.get(name);
    }

    getByModified(object: visual.Solid | c3d.SimpleName): ModifierStack | undefined {
        const { name2stack, modified2name } = this;
        const simpleName = object instanceof visual.Solid ? object.simpleName : object;
        const name = modified2name.get(simpleName);
        if (name === undefined) return;
        if (!name2stack.has(name)) throw new Error("invalid precondition");
        return name2stack.get(name)!;
    }

    async addItem(model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    async addItem(model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async addItem(model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    async addItem(model: c3d.Item, agent: Agent = 'user'): Promise<visual.Item> {
        const result = await this.db.addItem(model, agent);
        this.version2name.set(result.simpleName, result.simpleName);
        return result;
    }

    async replaceItem(from: visual.Solid, model: c3d.Solid, agent?: Agent): Promise<visual.Solid>;
    async replaceItem<T extends visual.SpaceItem>(from: visual.SpaceInstance<T>, model: c3d.SpaceInstance, agent?: Agent): Promise<visual.SpaceInstance<visual.Curve3D>>;
    async replaceItem<T extends visual.PlaneItem>(from: visual.PlaneInstance<T>, model: c3d.PlaneInstance, agent?: Agent): Promise<visual.PlaneInstance<visual.Region>>;
    async replaceItem(from: visual.Item, model: c3d.Item, agent?: Agent): Promise<visual.Item>;
    async replaceItem(from: visual.Item, to: c3d.Item): Promise<visual.Item> {
        const { name2stack: map, version2name, modified2name } = this;
        const name = version2name.get(from.simpleName)!;

        const result = this.db.replaceItem(from, to);
        if (map.has(name)) {
            const stack = map.get(name)!;
            const modified = await stack.update(to as c3d.Solid, result as Promise<visual.Solid>);
            modified2name.set(modified.simpleName, name);
        }

        const view = await result;

        version2name.delete(from.simpleName);
        version2name.set(view.simpleName, name);

        return result;
    }

    async removeItem(view: visual.Item, agent?: Agent): Promise<void> {
        const { version2name, name2stack, modified2name } = this;
        switch (this.stateOf(view)) {
            case 'modified':
                const name = modified2name.get(view.simpleName)!;
                const modifiers = name2stack.get(name)!;
                modified2name.delete(view.simpleName);
                name2stack.delete(name);
                modifiers.dispose();
                break;
            case 'premodified': {
                const name = version2name.get(view.simpleName)!;
                const modifiers = name2stack.get(name)!;
                modified2name.delete(modifiers.modified.simpleName);
                version2name.delete(view.simpleName)!;
                name2stack.delete(name);
                modifiers.dispose();
                break;
            }
        }

        return this.db.removeItem(view, agent);
    }

    async duplicate(model: visual.Solid): Promise<visual.Solid>;
    async duplicate<T extends visual.SpaceItem>(model: visual.SpaceInstance<T>): Promise<visual.SpaceInstance<T>>;
    async duplicate<T extends visual.PlaneItem>(model: visual.PlaneInstance<T>): Promise<visual.PlaneInstance<T>>;
    async duplicate(item: visual.Item): Promise<visual.Item> {
        // @ts-expect-error('typescript cant type polymorphism like this')
        const result = await this.db.duplicate(item);
        this.version2name.set(result.simpleName, result.simpleName);
        return result;
    }

    async replaceWithTemporaryItem(from: visual.Item, to: c3d.Item): Promise<TemporaryObject> {
        const { name2stack: map, version2name } = this;
        const name = version2name.get(from.simpleName)!;

        let result: TemporaryObject;
        if (map.has(name)) {
            const modifiers = map.get(name)!;
            result = await modifiers.updateTemporary(from, to as c3d.Solid);
        } else {
            result = await this.db.replaceWithTemporaryItem(from, to);
        }

        return result;
    }

    optimization<T>(from: visual.Item, fast: () => T, ifDisallowed: () => T): T {
        switch (this.stateOf(from as visual.Solid)) {
            case 'unmodified': return fast();
            default: return ifDisallowed();
        }
    }

    stateOf(item: visual.Item | c3d.SimpleName): 'unmodified' | 'premodified' | 'modified' {
        if (item instanceof visual.Item) item = item.simpleName;

        if (this.getByPremodified(item) !== undefined) return 'premodified';
        else if (this.getByModified(item) !== undefined) return 'modified';
        else return 'unmodified';
    }

    highlight(highlighter: HighlightManager): void {
        for (const [key, { premodified }] of this.name2stack.entries()) {
            premodified.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.userData.originalMaterial = child.material;
                    child.material = invisible;
                }
            })
        }
        this.selection.highlight(highlighter);
    }

    unhighlight(highlighter: HighlightManager): void {
        for (const [key, { premodified }] of this.name2stack.entries()) {
            premodified.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = child.userData.originalMaterial;
                    delete child.userData.originalMaterial;
                }
            })
        }
        this.selection.unhighlight(highlighter);
    }

    saveToMemento(): ModifierMemento {
        return new ModifierMemento(
            new Map(this.name2stack),
            new Map(this.version2name),
            new Map(this.modified2name),
        );
    }

    restoreFromMemento(m: ModifierMemento) {
        (this.name2stack as ModifierMemento['name2stack']) = m.name2stack;
        (this.version2name as ModifierMemento['version2name']) = m.version2name;
        (this.modified2name as ModifierMemento['modified2name']) = m.modified2name;
    }

    async serialize(): Promise<Buffer> {
        return this.saveToMemento().serialize();
    }

    async deserialize(data: Buffer): Promise<void> {
        this.restoreFromMemento(ModifierMemento.deserialize(data, this.db, this.materials, this.signals));
    }
}

class ModifierSelection extends SelectionProxy {
    constructor(private readonly db: DatabaseLike, private readonly modifiers: ModifierManager, selection: ModifiesSelection & Outlinable) {
        super(selection);
    }

    addSolid(solid: visual.Solid) {
        const { modifiers, selection } = this;
        switch (this.stateOf(solid)) {
            case 'unmodified':
                return super.addSolid(solid);
            case 'modified':
                super.addSolid(solid);
                const stack = modifiers.getByModified(solid)!;
                const { modified, premodified } = stack;
                premodified.visible = true;
                selection.addSolid(premodified);
                for (const edge of modified.allEdges) {
                    edge.visible = false;
                }
                modified.traverse(child => {
                    child.userData.oldLayerMask = child.layers.mask;
                    child.layers.set(visual.Layers.Unselectable);
                });
                return;
            case 'premodified': {
                const stack = modifiers.getByPremodified(solid)!;
                this.addSolid(stack.modified);
            }
        }
    }

    removeSolid(solid: visual.Solid) {
        switch (this.stateOf(solid)) {
            case 'unmodified':
            case 'premodified':
                return super.removeSolid(solid);
            case 'modified':
                throw new Error("invalid precondition");
        }
    }

    removeAll() {
        const { modifiers } = this;
        for (const id of this.selection.solidIds) {
            switch (this.stateOf(id)) {
                case 'unmodified': break;
                case 'premodified': break;
                case 'modified':
                    const stack = modifiers.getByModified(id)!;
                    this.hidePremodifiedAndShowModified(stack);
            }
        }
        super.removeAll();
    }

    get outlinable() {
        const { db, modifiers } = this;
        const outlineIds = new Set(this.solidIds);
        for (const id of outlineIds) {
            const state = this.stateOf(id);
            if (state === 'premodified') {
                const stack = modifiers.getByPremodified(id)!;
                outlineIds.delete(id);
                outlineIds.add(stack.modified.simpleName);
            }
        }
        return new ItemSelection<visual.Solid>(db, outlineIds)
    }

    private stateOf(solid: visual.Solid | c3d.SimpleName): 'unmodified' | 'premodified' | 'modified' {
        return this.modifiers.stateOf(solid);
    }

    private hidePremodifiedAndShowModified(stack: ModifierStack) {
        const { premodified } = stack;

        premodified.visible = false;

        ModifierSelection.showModified(stack);
    }

    static showModified(stack: ModifierStack) {
        const { modified } = stack;

        for (const edge of modified.allEdges) {
            edge.traverse(child => edge.visible = true);
        }
        modified.traverse(child => {
            child.layers.mask = child.userData.oldLayerMask;
            child.userData.oldLayerMask = undefined;
        });
    }

    get solids() {
        return this.unmodifiedSolids;
    }

    get unmodifiedSolids() {
        return new ItemSelection<visual.Solid>(this.db, this.unmodifiedSolidIds);
    }

    get unmodifiedSolidIds(): Set<c3d.SimpleName> {
        const result = new Set<c3d.SimpleName>();
        for (const id of this.solidIds) {
            if (this.stateOf(id) === 'unmodified' || this.stateOf(id) === 'premodified')
                result.add(id);
        }
        return result;
    }

    get modifiedSolids() {
        return new ItemSelection<visual.Solid>(this.db, this.modifiedSolidIds);
    }

    get modifiedSolidIds(): Set<c3d.SimpleName> {
        const result = new Set<c3d.SimpleName>();
        for (const id of this.solidIds) {
            if (this.stateOf(id) === 'unmodified' || this.stateOf(id) === 'modified')
                result.add(id);
        }
        return result;
    }
}