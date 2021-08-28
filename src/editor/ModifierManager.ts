import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { SymmetryFactory } from "../commands/mirror/MirrorFactory";
import { HasSelectedAndHovered, Highlightable, ModifiesSelection, SelectionManager } from "../selection/SelectionManager";
import { SelectionProxy } from "../selection/SelectionProxy";
import { DatabaseProxy } from "./DatabaseProxy";
import { EditorSignals } from "./EditorSignals";
import { Agent, DatabaseLike, GeometryDatabase, TemporaryObject } from "./GeometryDatabase";
import MaterialDatabase from "./MaterialDatabase";
import * as visual from "./VisualModel";

export type Replacement = { from: visual.Item, to: visual.Item }

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class ModifierStack {
    isEnabled = true;
    showWhileEditing = true;

    temp?: TemporaryObject;
    private _modified!: visual.Solid;
    private _unmodified!: visual.Solid;

    constructor(
        private readonly db: DatabaseLike,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals,
    ) { }

    get unmodified() { return this._unmodified }
    get modified() { return this._modified }

    async add(underlying: c3d.Solid, view: visual.Solid): Promise<visual.Solid> {
        const { unmodified, modified } = await this.calculate(underlying, Promise.resolve(view));
        this._modified = modified;
        this._unmodified = unmodified;
        return modified;
    }

    async update(underlying: c3d.Solid, view: Promise<visual.Solid>): Promise<visual.Solid> {
        const { unmodified, modified } = await this.calculate(underlying, view);
        this._modified = modified;
        this._unmodified = unmodified;
        return modified;
    }

    private async calculate(underlying: c3d.Solid, view: Promise<visual.Solid>): Promise<{ unmodified: visual.Solid, modified: visual.Solid }> {
        const symmetry = new SymmetryFactory(this.db, this.materials, this.signals);
        symmetry.solid = underlying;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(X, Z);
        console.time("calculate");
        const symmetrized = await symmetry.calculate();
        console.timeEnd("calculate");

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

    async updateTemporary(from: visual.Item, underlying: c3d.Solid) {
        from.visible = false;

        const symmetry = new SymmetryFactory(this.db, this.materials, this.signals);
        symmetry.solid = underlying;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(X, Z);
        const symmetrized = await symmetry.calculate();

        const result = (this.modified !== undefined) ?
            await this.db.replaceTemporaryItem(this.modified, symmetrized) :
            await this.db.addTemporaryItem(symmetrized);
        if (this.temp !== undefined) this.temp.cancel();

        result.show();
        this.temp = result;
        // FIXME when temp is cancelled, should delete reference
        return result;
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

    readonly selected: ModifiesSelection & Highlightable;
    readonly hovered: ModifiesSelection & Highlightable;

    constructor(
        db: GeometryDatabase,
        protected readonly selection: HasSelectedAndHovered,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) {
        super(db);
        this.selected = new ModifierSelection(this, selection.selected);
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

    get(object: visual.Solid): ModifierStack | undefined {
        const { version2name, map } = this;
        let name = version2name.get(object.simpleName);
        if (name === undefined) return undefined;

        return map.get(name);
    }

    reverse(object: visual.Solid | c3d.SimpleName): ModifierStack | undefined {
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

    async replaceTemporaryItem(from: visual.Item, to: c3d.Item): Promise<TemporaryObject> {
        const { map, version2name } = this;
        const name = version2name.get(from.simpleName)!;

        let result: TemporaryObject;
        if (map.has(name)) {
            const modifiers = map.get(name)!;
            result = await modifiers.updateTemporary(from, to as c3d.Solid);
        } else {
            result = await this.db.replaceTemporaryItem(from, to);
        }

        return result;
    }
};

class ModifierSelection extends SelectionProxy {
    constructor(private readonly modifiers: ModifierManager, selection: ModifiesSelection & Highlightable) {
        super(selection);
    }

    addSolid(solid: visual.Solid) {
        super.addSolid(solid);

        const { modifiers, selection } = this;
        const stack = modifiers.reverse(solid);
        if (stack === undefined) return;

        const { modified, unmodified } = stack;

        unmodified.visible = true;
        selection.addSolid(unmodified);
        selection.addSolid(solid);

        for (const edge of modified.allEdges) {
            edge.visible = false;
        }
        modified.traverse(child => {
            child.userData.oldLayerMask = child.layers.mask;
            child.layers.set(visual.Layers.Unselectable);
        });
    }

    removeSolid(solid: visual.Solid) {
        super.removeSolid(solid);

        this.removeById(solid.simpleName);
    }

    private removeById(id: c3d.SimpleName) {
        const { modifiers, selection } = this;
        const stack = modifiers.reverse(id);
        if (stack === undefined) return;

        const { modified, unmodified } = stack;

        unmodified.visible = false;
        selection.removeSolid(unmodified);

        for (const edge of modified.allEdges) {
            edge.traverse(child => {
                edge.visible = true;
            });
        }
        modified.traverse(child => {
            child.layers.mask = child.userData.oldLayerMask;
            child.userData.oldLayerMask = undefined;
        });
    }

    removeAll() {
        for (const id of this.selection.solidIds) this.removeById(id);
        super.removeAll();
    }
}