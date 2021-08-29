import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { SymmetryFactory } from "../commands/mirror/MirrorFactory";
import { ItemSelection } from "../selection/Selection";
import { HasSelectedAndHovered, Highlightable, ModifiesSelection } from "../selection/SelectionManager";
import { SelectionProxy } from "../selection/SelectionProxy";
import { DatabaseProxy } from "./DatabaseProxy";
import { EditorSignals } from "./EditorSignals";
import { Agent, DatabaseLike, GeometryDatabase, TemporaryObject } from "./GeometryDatabase";
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

    constructor(
        private readonly db: DatabaseLike,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals,
    ) { }

    get premodified() { return this._premodified }
    get modified() { return this._modified }

    async add(underlying: c3d.Solid, view: visual.Solid): Promise<visual.Solid> {
        const { unmodified, modified } = await this.calculate(underlying, Promise.resolve(view));
        this._modified = modified;
        this._premodified = unmodified;
        return modified;
    }

    async update(underlying: c3d.Solid, view: Promise<visual.Solid>): Promise<visual.Solid> {
        const { unmodified, modified } = await this.calculate(underlying, view);
        this._modified = modified;
        this._premodified = unmodified;
        return modified;
    }

    private async calculate(underlying: c3d.Solid, view: Promise<visual.Solid>): Promise<{ unmodified: visual.Solid, modified: visual.Solid }> {
        const symmetry = new SymmetryFactory(this.db, this.materials, this.signals);
        symmetry.solid = underlying;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(X, Z);
        const symmetrized = await symmetry.calculate();

        const modified = (this._modified !== undefined) ?
            await this.db.replaceItem(this._modified, symmetrized) :
            await this.db.addItem(symmetrized, 'automatic');

        const unmodified = await view;
        unmodified.visible = false;
        for (const face of unmodified.allFaces) {
            face.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = invisible;
                }
            });
        }

        return { unmodified, modified };
    }

    async updateTemporary(from: visual.Item, underlying: c3d.Solid): Promise<TemporaryObject> {
        const symmetry = new SymmetryFactory(this.db, this.materials, this.signals);
        symmetry.solid = underlying;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(X, Z);
        const symmetrized = await symmetry.doUpdate();
        if (symmetrized.length != 1) throw new Error("invalid postcondition");
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
        if (this.modified !== undefined) {
            this.db.removeItem(this.modified);
        }
    }
}

const invisible = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    depthTest: false,
});

export default class ModifierManager extends DatabaseProxy implements HasSelectedAndHovered {
    protected readonly map = new Map<c3d.SimpleName, ModifierStack>();
    protected readonly version2name = new Map<c3d.SimpleName, c3d.SimpleName>();
    protected readonly modified2name = new Map<c3d.SimpleName, c3d.SimpleName>();

    readonly selected: ModifierSelection;
    readonly hovered: ModifiesSelection & Highlightable;

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

    async add(object: visual.Solid): Promise<ModifierStack> {
        const { version2name, selection, map, modified2name, db, materials, signals } = this;
        let name = version2name.get(object.simpleName);
        if (name === undefined) {
            // FIXME this is TEMPORARY just for reloading files. replace when there is a better file reload strategy
            version2name.set(object.simpleName, object.simpleName);
            name = object.simpleName;
        }

        selection.selected.removeSolid(object);

        const modifiers = new ModifierStack(db, materials, signals);
        map.set(name, modifiers);

        const result = await modifiers.add(db.lookup(object), object);
        modified2name.set(result.simpleName, name);
        return modifiers;
    }

    getByPremodified(object: visual.Solid | c3d.SimpleName): ModifierStack | undefined {
        const { version2name, map } = this;
        const simpleName = object instanceof visual.Solid ? object.simpleName : object;
        let name = version2name.get(simpleName);
        if (name === undefined) return undefined;

        return map.get(name);
    }

    getByModified(object: visual.Solid | c3d.SimpleName): ModifierStack | undefined {
        const { map, modified2name } = this;
        const simpleName = object instanceof visual.Solid ? object.simpleName : object;
        const name = modified2name.get(simpleName);
        if (name === undefined) return;
        if (!map.has(name)) throw new Error("invalid precondition");
        return map.get(name)!;
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
        const { map, version2name, modified2name } = this;
        const name = version2name.get(from.simpleName)!;

        const result = this.db.replaceItem(from, to);
        if (map.has(name)) {
            const modifiers = map.get(name)!;
            const modified = await modifiers.update(to as c3d.Solid, result as Promise<visual.Solid>);
            modified2name.set(modified.simpleName, name);
        }

        const view = await result;

        version2name.delete(from.simpleName);
        version2name.set(view.simpleName, name);

        return result;
    }

    async removeItem(view: visual.Item, agent?: Agent): Promise<void> {
        const { version2name, map } = this;
        const name = version2name.get(view.simpleName)!;

        if (map.has(name)) {
            const modifiers = map.get(name)!;
            modifiers.dispose();
        }
        version2name.delete(view.simpleName)!;
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
        const { map, version2name } = this;
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

    didModifyTemporarily(ifDisallowed: () => Promise<TemporaryObject[]>): Promise<TemporaryObject[]> {
        return ifDisallowed();
    }
};

class ModifierSelection extends SelectionProxy {
    constructor(private readonly db: DatabaseLike, private readonly modifiers: ModifierManager, selection: ModifiesSelection & Highlightable) {
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
            case 'premodified':
                throw new Error("invalid precondition");
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
        if (this.modifiers.getByPremodified(solid) !== undefined) return 'premodified';
        else if (this.modifiers.getByModified(solid) !== undefined) return 'modified';
        else return 'unmodified';
    }

    private hidePremodifiedAndShowModified(stack: ModifierStack) {
        const { modified, premodified } = stack;

        premodified.visible = false;

        for (const edge of modified.allEdges) {
            edge.traverse(child => edge.visible = true);
        }
        modified.traverse(child => {
            child.layers.mask = child.userData.oldLayerMask;
            child.userData.oldLayerMask = undefined;
        });
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
}