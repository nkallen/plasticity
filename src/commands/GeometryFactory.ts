import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase, TemporaryObject } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ResourceRegistration } from '../util/Cancellable';
import * as visual from '../editor/VisualModel';

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
        let result = await this.computeGeometry();
        const geometries = toArray(result);
        for (const geometry of geometries) {
            promises.push(this.db.addTemporaryItem(geometry));
        }

        await Promise.all(promises);

        for (const i of this.originalItems) this.db.hide(i);
        for (const temp of this.temps) temp.cancel();

        const temps = [];
        for (const p of promises) {
            temps.push(await p);
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
            for (const temp of this.temps) {
                temp.cancel();
            }
        }
    }

    protected doCancel(): void {
        for (const i of this.originalItems) this.db.unhide(i);
        for (const temp of this.temps) temp.cancel();
    }

    protected computeGeometry(): Promise<c3d.Item> | Promise<c3d.Item[]> { throw new Error("Implement this for simple factories"); }
    protected get originalItem(): visual.Item | visual.Item[] | undefined { return undefined }
    private get originalItems() {
        return toArray(this.originalItem);
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