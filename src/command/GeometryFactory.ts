import { Signal } from "signals";
import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike, MaterialOverride, TemporaryObject } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { CancellableRegisterable } from "../util/CancellableRegisterable";
import { zip } from '../util/Util';
import * as visual from '../visual_model/VisualModel';

type State = { tag: 'none', last: undefined }
    | { tag: 'updated', last?: Map<string, any> }
    | { tag: 'updating', hasNext: boolean, failed?: any, last?: Map<string, any> }
    | { tag: 'failed', error: any, last?: Map<string, any> }
    | { tag: 'cancelled' }
    | { tag: 'committed' }

export type PhantomInfo = { phantom: c3d.Item, material: MaterialOverride }

/**
 * A GeometryFactory is an object responsible for making and transforming geometrical objects, like
 * solids and curves. All of the spheres and circles and fillets and boolean operations are represented
 * as factories. The factories take various arguments (such as a fillet radius) and have commit(), update(),
 * and cancel() methods. Commit() computes the geometry and adds it to the database whereas update() creates
 * a temporary object for visualization before the user decides to commit().
 * 
 * A typical subclass only implements the calculate() template method. So the default superclass update()
 * and commit() (which call calculate()) are sufficient in 90% of cases; the exceptions are usually to allow
 * update() to have optimizations. Scale, for example, can show results to the user without having to invoke
 * c3d commands (which are often slower and always generate a lot of garbage).
 * 
 * Further, one should be aware that some factories create objects (like a new sphere), some create
 * and CONSUME objects such as boolean union (where two objects become one), some replace like fillet, and so
 * forth. Thus there is some code complexity in managing the inserting, replacing, deleting, etc. of objects
 * in the databases. All of this is implemented in AbstractGeometryFactory -- it is the "essential" functionality.
 * 
 * In addition to the above, a GeometryFactory is a state machine. Because computations can succeed and fail,
 * and because computations can take a long time (and happen asynchronously), the GeometryFactory has states
 * like none/updating/updated/failed/cancelled/committed. For the purposes of code organization and unit testing,
 * the state machine behavior is implemented in the abstract subclass GeometryFactory.
 * 
 * Particularly in the case of update(), where the user is interactively trying one value after another,
 * the factory can temporarily be in a failure state. Similarly, if an update takes too long, the user
 * might request another update before the last has finished. Hence there are states like 'updating',
 * 'failed', 'updated', etc.
 * 
 * In general, if the user is requesting updates too fast we drop all but the most recent request; this
 * is implemented with the hasNext field on the updating state. We also need to ensure some synchronization;
 * if an update is taking too long and in the meantime the user cancels or commits, the system needs to
 * end up in a coherent state. We could queue everything to do this, which would be simple but slow. Instead,
 * after every `await` check if the state has changed and if so perform whatever cleanup is necessary.
 * 
 * Finally, in the case of (temporary) failure, if the subclass implements a key() method, we store the last successful
 * value and try to return to that state whenever the user is done requesting updates. This works best
 * when a user exceeds some max value, (like a max fillet radius).
 */

export abstract class AbstractGeometryFactory extends CancellableRegisterable {
    readonly changed = new Signal();

    private _state: State = { tag: 'none', last: undefined };
    get state() { return this._state }
    set state(state: State) {
        this._state = state;
        this.changed.dispatch();
    }

    constructor(
        protected readonly db: DatabaseLike,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { super() }

    protected temps: TemporaryObject[] = [];

    protected async doUpdate(options?: any): Promise<TemporaryObject[]> {
        const promises = [];

        // 0. Make sure original items are visible if we're not going to remove them
        if (!this.shouldRemoveOriginalItemOnCommit) for (const i of this.originalItems)
            i.visible = true;

        // 1. Asynchronously compute the geometry
        let result;
        try {
            performance.mark('begin-factory-calculate');
            result = await this.calculate(options);
        } catch (e) {
            if (e instanceof ValidationError) this.cleanupTempsOnFinishOrCancel();
            throw e;
        } finally {
            performance.measure('factory-calculate', 'begin-factory-calculate');
        }
        if (this.state.tag === 'cancelled' || this.state.tag === 'committed') return Promise.resolve([]);

        // 2. Asynchronously compute the mesh for temporary items.
        const geometries = toArray(result);
        const zipped = this.zip(this.originalItems, geometries, this.shouldHideOriginalItemDuringUpdate);

        for (const [from, to] of zipped) {
            if (from === undefined) {
                promises.push(this.db.addTemporaryItem(to!));
            } else if (to === undefined) {
                from.visible = false;
            } else {
                promises.push(this.db.replaceWithTemporaryItem(from, to));
            }
        }

        this.addPhantoms(promises);

        // 3. When all async work is complete, we can safely show/hide items to the user;
        // The specific order of operations is designed to avoid any flicker: compute
        // everything async, then sync show/hide objects when all data is ready.
        const finished = await Promise.all(promises);

        // 3.a. remove any previous temporary items.
        for (const temp of this.temps) temp.cancel();

        // @ts-expect-error('cancelled is a possible state because the user may have cancelled during an async operation')
        if (this.state.tag === 'cancelled' || this.state.tag === 'committed') {
            for (const p of finished) p.cancel();
            return Promise.resolve([]);
        }

        // 3.c. show the newly created temporary items.
        return this.showTemps(finished);
    }

    protected addPhantoms(into: Promise<TemporaryObject>[]) {
        for (const { phantom, material } of this.phantoms) {
            into.push(this.db.addPhantom(phantom, material));
        }
    }

    protected showTemps(finished: TemporaryObject[]) {
        const temps = [];
        for (const p of finished) {
            const temp = p;
            temp.show();
            temp.underlying.updateMatrixWorld();
            temps.push(temp);
        }
        this.temps = temps;

        return this.temps;
    }

    protected async doCommit(): Promise<visual.Item | visual.Item[]> {
        try {
            const unarray = await this.calculate();
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
            const promises = [];
            const zipped = this.zip(this.originalItems, detached, this.shouldRemoveOriginalItemOnCommit);
            for (const [from, to] of zipped) {
                if (from === undefined) {
                    promises.push(this.db.addItem(to!));
                } else if (to === undefined) {
                    this.db.removeItem(from);
                } else {
                    promises.push(this.db.replaceItem(from, to))
                }
            }

            const result = await Promise.all(promises);
            return dearray(result, unarray);
        } finally {
            await Promise.resolve(); // This removes flickering when rendering. // FIXME is that still true?
            for (const i of this.originalItems) i.visible = true;
            this.cleanupTempsOnFinishOrCancel();
        }
    }

    protected cleanupTempsOnFinishOrCancel() {
        for (const temp of this.temps) temp.cancel();
        this.temps = [];
    }

    private zip(originals: visual.Item[], replacements: c3d.Item[], shouldRemoveOriginal: boolean) {
        if (shouldRemoveOriginal) {
            return zip(originals, replacements);
        } else {
            return zip([], replacements);
        }
    }

    protected doCancel(): void {
        this.refresh();
    }

    refresh() {
        for (const i of this.originalItems) i.visible = true;
        this.cleanupTempsOnFinishOrCancel();
    }

    calculate(options?: any): Promise<c3d.Item | c3d.Item[]> { throw new Error("Implement this for simple factories"); }
    protected get phantoms(): PhantomInfo[] { return [] }
    protected get originalItem(): visual.Item | visual.Item[] | undefined { return undefined }
    private get originalItems() {
        return toArray(this.originalItem);
    }
    protected get shouldRemoveOriginalItemOnCommit() { return true }
    protected get shouldHideOriginalItemDuringUpdate() { return this.shouldRemoveOriginalItemOnCommit }

    async update(): Promise<void> { await this.doUpdate() }
    async commit(): Promise<visual.Item | visual.Item[]> { return this.doCommit() }
    cancel() { this.doCancel() }

    // NOTE: All factories should be explicitly commit or cancel.
    finish() { }
    interrupt() { }
}

export abstract class GeometryFactory extends AbstractGeometryFactory {
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
                    // @ts-expect-error
                    if (this.state.tag !== 'cancelled') this.signals.factoryUpdated.dispatch();
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
            case 'cancelled': break;
            case 'committed': break;
            default: throw new Error("invalid state: " + this.state.tag);
        }
    }

    private async revertToLastSuccess() {
        switch (this.state.tag) {
            case 'failed':
                const e = this.state.error;
                if (!(e instanceof NoOpError)) {
                    if (e instanceof ValidationError || e.isC3dError) {
                        console.warn(`${this.constructor.name}: ${e.message}`);
                    }
                }

                if (this.state.last !== undefined) {
                    this.restoreSavedState(this.state.last);
                    await this.update();
                } else {
                    if (!(e instanceof NoOpError)) {
                        if (e instanceof ValidationError || e.isC3dError) {
                            this.signals.factoryUpdateFailed.dispatch(e);
                        } else throw e;
                    }
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
            case 'updating':
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

    cancel() {
        switch (this.state.tag) {
            case 'updated':
            case 'none':
            case 'cancelled':
            case 'failed':
            case 'updating':
                this.doCancel();
                this.state = { tag: 'cancelled' };
                this.signals.factoryCancelled.dispatch();
                return;
            default:
                throw new Error(`Factory ${this.constructor.name} in invalid state: ${this.state.tag}`);
        }
    }

    pause() {
        switch (this.state.tag) {
            case 'none':
            case 'updated':
            case 'failed':
            case 'updating':
                for (const temp of this.temps) temp.hide();
                break;
            default:
                throw new Error(`Factory ${this.constructor.name} in invalid state: ${this.state.tag}`);
        }
    }

    resume() {
        switch (this.state.tag) {
            case 'none':
            case 'updated':
            case 'failed':
            case 'updating':
                for (const temp of this.temps) temp.show();
                break;
            default:
                throw new Error(`Factory ${this.constructor.name} in invalid state: ${this.state.tag}`);
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
export class NoOpError extends ValidationError {
    constructor() {
        super("Operation has no effect");
    }
}

module.hot?.accept();