import { Cancellable } from '../Cancellable';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';

type callUpdateSuper = never;
type callCommitSuper = never;
type callCancelSuper = never;

type State = 'none' | 'updated' | 'cancelled' | 'committed'
export abstract class GeometryFactory extends Cancellable {
    state: State = 'none';

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

    update(): callUpdateSuper {
        switch (this.state) {
            case 'none':
            case 'updated':
                this.state = 'updated';
                this.signals.factoryUpdated.dispatch();
                return undefined as callUpdateSuper;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    commit(): callCommitSuper {
        switch (this.state) {
            case 'none':
            case 'updated':
                this.state = 'committed';
                this.signals.factoryCommitted.dispatch();
                return undefined as callUpdateSuper;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    cancel(): callCancelSuper {
        switch (this.state) {
            case 'none':
            case 'cancelled':
            case 'updated':
                return undefined as callCancelSuper;
            default:
                throw new Error('invalid state: ' + this.state);
        }
    }

    private previous?: Map<keyof this, any>;
    transaction(keys: (keyof this)[], cb: () => void) {
        try {
            cb();
            this.previous = new Map();
            for (const key of keys) {

                const uncloned = this[key];
                let value = uncloned;
                if (typeof uncloned === 'object' && 'clone' in uncloned) {
                    // @ts-ignore
                    value = uncloned.clone();
                }
                this.previous.set(key, value);
            }
        } catch (e) {
            console.warn(e);
            if (this.previous != null) {
                for (const key of keys) {
                    this[key] = this.previous.get(key);
                }
            }
        }
    }
}