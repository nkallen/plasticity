import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { ResourceRegistration } from '../util/Cancellable';
import * as visual from '../VisualModel';

type State = { tag: 'none' } | { tag: 'updated' } | { tag: 'updating', hasNext: boolean, failed?: any } | { tag: 'failed', error: any } | { tag: 'cancelled' } | { tag: 'committed' }

export abstract class GeometryFactory extends ResourceRegistration {
    state: State = { tag: 'none' };

    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { super() }

    protected abstract doUpdate(): Promise<void>;
    protected abstract doCommit(): Promise<visual.SpaceItem | visual.SpaceItem[]>;
    protected abstract doCancel(): void;

    async update() {
        switch (this.state.tag) {
            case 'none':
            case 'failed':
            case 'updated':
                this.state = { tag: 'updating', hasNext: false };
                c3d.Mutex.EnterParallelRegion();
                try {
                    await this.doUpdate();
                    this.signals.factoryUpdated.dispatch();
                } catch (e) {
                    this.state.failed = e ?? "unknown error";
                } finally {
                    c3d.Mutex.ExitParallelRegion();
                    const hasNext = this.state.hasNext;
                    const error = this.state.failed;
                    if (!hasNext && error) {
                        this.state = { tag: 'failed', error: error };
                        throw error;
                    } else {
                        this.state = { tag: 'updated' };
                        if (hasNext) await this.update();
                    }
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

    async commit(): Promise<visual.SpaceItem | visual.SpaceItem[]> {
        switch (this.state.tag) {
            case 'none':
            case 'updated':
                try {
                    c3d.Mutex.EnterParallelRegion();
                    const result = await this.doCommit();
                    c3d.Mutex.ExitParallelRegion();
                    this.state = { tag: 'committed' };
                    this.signals.factoryCommitted.dispatch();
                    return result;
                } catch (e) {
                    await this.cancel();
                    throw e;
                }
            case 'failed':
                this.cancel();
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
                this.doCancel();
            case 'cancelled':
            case 'failed':
            case 'updating':
                this.state = { tag: 'cancelled' };
                return;
            default:
                throw new Error('invalid state: ' + this.state.tag);
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
            // this.previous.set("state", this.state);
        } catch (e) {
            console.warn(e);
            if (this.previous != null) {
                this[key] = this.previous.get(key);
                // this.state = this.previous.get("state");
            }
        }
    }
}