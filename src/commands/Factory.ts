import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { ResourceRegistration } from '../util/Cancellable';
import { Scheduler } from '../util/Scheduler';
import * as visual from '../VisualModel';

type State = 'none' | 'updated' | 'failed' | 'cancelled' | 'committed'

export abstract class GeometryFactory extends ResourceRegistration {
    state: State = 'none';
    private readonly scheduler = new Scheduler(1, 1);

    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { super() }

    protected abstract doUpdate(): Promise<void>;
    protected abstract doCommit(): Promise<visual.SpaceItem | visual.SpaceItem[]>;
    protected abstract doCancel(): void;

    async update() {
        const state = this.state;
        switch (state) {
            case 'none':
            case 'failed':
            case 'updated':
                try {
                    c3d.Mutex.EnterParallelRegion();
                    await this.doUpdate();
                    c3d.Mutex.ExitParallelRegion();
                    this.signals.factoryUpdated.dispatch();
                    this.state = 'updated';
                } catch (e) {
                    this.state = 'failed';
                    this.signals.factoryUpdated.dispatch();
                    throw e;
                }
                return;
            default:
                throw new Error('invalid state: ' + state);
        }
    }

    async commit(): Promise<visual.SpaceItem | visual.SpaceItem[]> {
        const state = this.state;
        switch (state) {
            case 'none':
            case 'updated':
                try {
                    c3d.Mutex.EnterParallelRegion();
                    const result = await this.doCommit();
                    c3d.Mutex.ExitParallelRegion();
                    this.state = 'committed';
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

    // Factories can be cancelled but "finishing" is a no-op. Commit must be called explicitly.
    async finish() { }

    async cancel() {
        const state = this.state;
        switch (state) {
            case 'updated':
            case 'none':
                this.doCancel();
            case 'cancelled':
            case 'failed':
                this.state = 'cancelled';
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