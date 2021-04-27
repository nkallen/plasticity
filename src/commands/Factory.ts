import { Cancellable } from '../util/Cancellable';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import * as visual from '../VisualModel';
import { Scheduler } from '../util/Scheduler';

type State = 'none' | 'updated' | 'failed' | 'cancelled' | 'committed'

export abstract class GeometryFactory extends Cancellable {
    state: State = 'none';
    private readonly scheduler = new Scheduler(1, 1);

    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { super() }

    finish(): void {
        switch (this.state) {
            case 'none':
            case 'updated':
                this.commit();
                break;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    protected abstract doUpdate(): Promise<void>;
    protected abstract doCommit(): visual.SpaceItem | visual.SpaceItem[];
    protected abstract doCancel(): void;

    async update() {
        switch (this.state) {
            case 'none':
            case 'failed':
            case 'updated':
                this.signals.factoryUpdated.dispatch();
                try {
                    await this.doUpdate();
                    this.state = 'updated';
                } catch (e) {
                    this.state = 'failed';
                    throw e;
                }
                return;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    commit(): visual.SpaceItem | visual.SpaceItem[] {
        switch (this.state) {
            case 'none':
            case 'updated':
                this.state = 'committed';
                this.signals.factoryCommitted.dispatch();
                return this.doCommit();
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    cancel(): void {
        switch (this.state) {
            case 'updated':
                this.doCancel();
            case 'none':
            case 'cancelled':
            case 'failed':
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