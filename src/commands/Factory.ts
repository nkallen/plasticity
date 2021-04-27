import { Cancellable } from '../util/Cancellable';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import * as visual from '../VisualModel';
import { Scheduler } from '../util/Scheduler';

type State = 'none' | 'updated' | 'failed' | 'cancelled' | 'committed'

export abstract class GeometryFactory extends Cancellable {
    state: Promise<State> = Promise.resolve('none');
    private readonly scheduler = new Scheduler(1, 1);

    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { super() }

    async finish() {
        const state = await this.state;
        switch (state) {
            case 'none':
            case 'updated':
                this.commit();
                break;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    protected abstract doUpdate(): Promise<void>;
    protected abstract doCommit(): Promise<visual.SpaceItem | visual.SpaceItem[]>;
    protected abstract doCancel(): void;

    async update() {
        const state = await this.state;
        switch (state) {
            case 'none':
            case 'failed':
            case 'updated':
                this.signals.factoryUpdated.dispatch();
                try {
                    await this.doUpdate();
                    this.state = Promise.resolve('updated');
                } catch (e) {
                    this.state = Promise.resolve('failed');
                    throw e;
                }
                return;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    async commit(): Promise<visual.SpaceItem | visual.SpaceItem[]> {
        const state = await this.state;
        switch (state) {
            case 'none':
            case 'updated':
                const result = await this.doCommit();
                this.state = Promise.resolve('committed');
                this.signals.factoryCommitted.dispatch();
                return result;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    async cancel() {
        const state = await this.state;
        switch (state) {
            case 'updated':
                await this.doCancel();
            case 'none':
            case 'cancelled':
            case 'failed':
                this.state = Promise.resolve('cancelled');
                return;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    private previous?: Map<keyof this, any>;
    async transaction(keys: (keyof this)[], cb: () => Promise<void>) {
        try {
            await cb();
            this.previous = new Map();
            for (const key of keys) {
                const uncloned = this[key];
                let value = uncloned;
                if (typeof uncloned === 'object' && 'clone' in uncloned) {
                    // @ts-expect-error("clone doesn't exist")
                    value = uncloned.clone();
                }
                this.previous.set(key, value);
            }
            this.previous.set("state", this.state);
        } catch (e) {
            console.warn(e);
            if (this.previous != null) {
                for (const key of keys) {
                    this[key] = this.previous.get(key);
                }
                this.state = this.previous.get("state");
            }
        }
    }

    schedule(fn: () => Promise<void>) {
        this.scheduler.schedule(fn);
    }
}