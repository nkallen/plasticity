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
                throw new Error('invalid state: ' + state);
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
                try {
                    await this.doUpdate();
                    this.signals.factoryUpdated.dispatch();
                    this.state = Promise.resolve('updated');
                } catch (e) {
                    this.state = Promise.resolve('failed');
                    this.signals.factoryUpdated.dispatch();
                    throw e;
                }
                return;
            default:
                throw new Error('invalid state: ' + state);
        }
    }

    async commit(): Promise<visual.SpaceItem | visual.SpaceItem[]> {
        const state = await this.state;
        switch (state) {
            case 'none':
            case 'updated':
                try {
                    const result = await this.doCommit();
                    this.state = Promise.resolve('committed');
                    this.signals.factoryCommitted.dispatch();
                    return result;
                } catch (e) {
                    await this.cancel();
                    throw e;
                }
            case 'failed':
                this.cancel();
                throw new Error('invalid state: ' + state);
            default:
                throw new Error('invalid state: ' + state);
        }
    }

    async cancel() {
        const state = await this.state;
        switch (state) {
            case 'updated':
            case 'none':
                await this.doCancel();
            case 'cancelled':
            case 'failed':
                this.state = Promise.resolve('cancelled');
                return;
            default:
                throw new Error('invalid state: ' + state);
        }
    }

    private previous?: Map<keyof this, any>;
    async transaction(key: (keyof this), cb: () => Promise<void>) {
        try {
            await cb();
            this.previous = new Map();
            const uncloned = this[key];
            let value = uncloned;
            if (typeof uncloned === 'object' && 'clone' in uncloned) {
                // @ts-expect-error("clone doesn't exist")
                value = uncloned.clone();
            }
            this.previous.set(key, value);
            this.previous.set("state", this.state);
        } catch (e) {
            console.warn(e);
            if (this.previous != null) {
                this[key] = this.previous.get(key);
                this.state = this.previous.get("state");
            }
        }
    }

    schedule(fn: () => Promise<void>) {
        this.scheduler.schedule(fn);
    }
}