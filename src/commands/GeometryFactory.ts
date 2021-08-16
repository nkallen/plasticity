import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase, MaterialOverride, TemporaryObject } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ResourceRegistration } from '../util/Cancellable';
import * as visual from '../editor/VisualModel';
import * as THREE from 'three';

type State = { tag: 'none', last: undefined }
    | { tag: 'updated', last?: Map<string, any> }
    | { tag: 'updating', hasNext: boolean, failed?: any, last?: Map<string, any> }
    | { tag: 'failed', error: any, last?: Map<string, any> }
    | { tag: 'cancelled' }
    | { tag: 'committed' }

/**
 * Subclasses of GeometryFactory implement template update() and commit() methods. This abstract class
 * implements a state machine that does a lot of error handling. Update previews the computation to but
 * the user but commit() is required to actually store the result in the geometry database.
 * 
 * Particularly in the case of update(), where the user is interactively trying one value after another,
 * the factory can temporarily be in a failure state. Similarly, if an update takes too long, the user
 * might request another update before the last has finished. Hence there are states like 'updating',
 * 'failed', 'updated', etc.
 * 
 * In general, if the user is requesting updates too fast we drop all but the most recent request; this
 * is implemented with the hasNext field on the updating state.
 * 
 * In the case of failure, if the subclass implements a key() method, we store the last successful
 * value and try to return to that state whenever the user is done requesting updates. This works best
 * when a user exceeds some max value, (like a max fillet radius).
 */

export abstract class GeometryFactory extends ResourceRegistration {
    state: State = { tag: 'none', last: undefined };

    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { super() }

    // MARK: Default implementations of the template methods. Override for more complicated commands

    protected temps: TemporaryObject[] = [];

    protected async doUpdate(): Promise<void> {
        const promises = [];

        // 1. Asynchronously compute the geometry and the phantom, if it exists
        let phantom, result;
        try {
            phantom = this.computePhantom().then(async ph => {
                if (ph !== undefined) return this.db.addTemporaryItem(ph, phantomMaterial);
            });
            result = await this.computeGeometry();
        } catch (e) {
            // If it fails, we should clean up temporary items from previous successful run and abort
            for (const temp of this.temps) temp.cancel();
            for (const i of this.originalItems) this.db.unhide(i);
            throw e;
        }

        // 2. Asynchronously compute the mesh for temporary items.
        const geometries = toArray(result);
        for (const geometry of geometries) {
            promises.push(this.db.addTemporaryItem(geometry));
        }

        // 3. When all async work is complete, we can safely show/hide items to the user;
        // The specific order of operations is design to avoid any flicker: compute
        // everything async, then sync show/hide objects.
        await Promise.all(promises);
        const phant = await phantom;

        // 3.a. remove any previous temporary items.
        for (const temp of this.temps) temp.cancel();

        // 3.b. The "original item" is the item the user is manipulating, in most cases we hide it
        for (const i of this.originalItems) {
            if (this.shouldHideOriginalItem) this.db.hide(i);
            else this.db.unhide(i);
        }

        // 3.c. show the newly created temporary items.
        const temps = [];
        for (const p of promises) {
            const temp = await p;
            temp.show();
            temps.push(temp);
        }
        if (phant !== undefined) {
            phant.show();
            temps.push(phant);
        }
        this.temps = temps;
    }

    protected async doCommit(): Promise<visual.Item | visual.Item[]> {
        try {
            const promises = [];
            const unarray = await this.computeGeometry();
            const geometries = toArray(unarray);
            let detached: c3d.Item[] = [];
            const names = new c3d.SNameMaker(c3d.CreatorType.DetachSolid, c3d.ESides.SideNone, 0);
            for (const item of geometries) {
                if (item instanceof c3d.Solid) {
                    const { parts } = c3d.ActionSolid.DetachParts(item, false, names);
                    detached = detached.concat(parts);
                    detached.push(item);
                } else {
                    detached.push(item);
                }
            }
            for (const geometry of detached) {
                promises.push(this.db.addItem(geometry));
            }
            const result = await Promise.all(promises);
            for (const i of this.originalItems) this.db.removeItem(i);
            return dearray(result, unarray);
        } finally {
            await Promise.resolve(); // This removes flickering when rendering.
            for (const temp of this.temps) temp.cancel();
        }
    }

    protected doCancel(): void {
        for (const i of this.originalItems) this.db.unhide(i);
        for (const temp of this.temps) temp.cancel();
    }

    protected computeGeometry(): Promise<c3d.Item> | Promise<c3d.Item[]> { throw new Error("Implement this for simple factories"); }
    protected computePhantom(): Promise<c3d.Item | void> { return Promise.resolve() }
    protected get originalItem(): visual.Item | visual.Item[] | undefined { return undefined }
    private get originalItems() {
        return toArray(this.originalItem);
    }
    protected get shouldHideOriginalItem() {
        return true;
    }

    // MARK: Below is the complicated StateMachine behavior

    async update() {
        switch (this.state.tag) {
            case 'none':
            case 'failed':
            case 'updated':
                this.state = { tag: 'updating', hasNext: false, last: this.state.last };
                c3d.Mutex.EnterParallelRegion();
                let before = this.saveState();
                try {
                    await this.doUpdate();
                    this.signals.factoryUpdated.dispatch();
                } catch (e) {
                    this.state.failed = e ?? new Error("unknown error");
                } finally {
                    c3d.Mutex.ExitParallelRegion();

                    await this.continueUpdatingIfMoreWork(before);
                }
                break;
            case 'updating':
                if (this.state.hasNext) console.warn("Dropping job because of latency");
                this.state.hasNext = true;
                break;
            default:
                throw new Error('invalid state: ' + this.state.tag);
        }
    }

    // If another update() job was "enqueued" while still doing the previous one, do that too
    private async continueUpdatingIfMoreWork(before: Map<string, any> | undefined) {
        switch (this.state.tag) {
            case 'updating':
                const hasNext = this.state.hasNext;
                const error = this.state.failed;
                if (error) {
                    this.state = { tag: 'failed', error, last: this.state.last };
                    if (hasNext) await this.update();
                    else await this.revertToLastSuccess();
                } else {
                    this.state = { tag: 'updated', last: before };
                    if (hasNext) await this.update();
                }
                break;
            default: throw new Error("invalid state: " + this.state.tag);
        }
    }

    private async revertToLastSuccess() {
        switch (this.state.tag) {
            case 'failed':
                if (this.state.last !== undefined) {
                    this.restoreSavedState(this.state.last);
                    await this.update();
                } else {
                    const e = this.state.error;
                    if (e instanceof ValidationError || e.isC3dError)
                        console.warn(`${this.constructor.name}: ${e.message}`);
                    else throw e;
                }
                break;
            case 'updating': break;
            default:
                throw new Error("invalid state: " + this.state.tag);
        }
    }

    async commit(): Promise<visual.Item | visual.Item[]> {
        switch (this.state.tag) {
            case 'none':
            case 'updated':
            case 'failed':
                try {
                    c3d.Mutex.EnterParallelRegion();
                    const result = await this.doCommit();
                    c3d.Mutex.ExitParallelRegion();
                    this.state = { tag: 'committed' };
                    this.signals.factoryCommitted.dispatch();
                    return result;
                } catch (error) {
                    this.state = { tag: 'failed', error };
                    this.doCancel();
                    throw error;
                }
            default:
                throw new Error('invalid state: ' + this.state.tag);
        }
    }

    // Factories can be cancelled but "finishing" is a no-op. Commit must be called explicitly.
    async finish() { }

    cancel() {
        switch (this.state.tag) {
            case 'updated':
            case 'none':
            case 'cancelled':
            case 'failed':
            case 'updating':
                this.doCancel();
                this.state = { tag: 'cancelled' };
                return;
            default:
                throw new Error('invalid state: ' + this.state.tag);
        }
    }

    private saveState(): Map<string, any> | undefined {
        if (this.keys.length === 0) return;
        const result = new Map();
        for (const key of this.keys) {
            const uncloned = this[key as keyof this];
            let value = uncloned;
            if (typeof uncloned === 'object' && 'clone' in uncloned) {
                // @ts-expect-error("clone doesn't exist")
                value = uncloned.clone();
            }
            result.set(key, value);
        }
        return result;
    }

    private restoreSavedState(last: Map<string, any>) {
        for (const key of this.keys) {
            this[key as keyof this] = last.get(key);
        }
    }

    protected get keys(): string[] {
        return [];
    }
}

function toArray<T>(x: T | T[] | undefined): T[] {
    if (x === undefined) return [];
    if (x instanceof Array) return x;
    return [x];
}

function dearray<S, T>(array: S[], antecedent: T | T[]): S | S[] {
    if (antecedent instanceof Array) return array;
    return array[0];
}

export class ValidationError extends Error { }

const mesh_red = new THREE.MeshMatcapMaterial();
mesh_red.color.setHex(0xff0000);
mesh_red.opacity = 0.1;
mesh_red.transparent = true;
mesh_red.fog = false;
mesh_red.polygonOffset = true;
mesh_red.polygonOffsetFactor = 0.1;
mesh_red.polygonOffsetUnits = 1;

const phantomMaterial: MaterialOverride = {
    mesh: mesh_red
}