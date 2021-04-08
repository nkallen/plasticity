import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';

type callUpdateSuper = never;
type callCommitSuper = never;

export abstract class GeometryFactory {
    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) { }

    update(): callUpdateSuper {
        this.signals.factoryUpdated.dispatch();
        return undefined as callUpdateSuper;
    }

    commit(): callCommitSuper {
        this.signals.factoryCommitted.dispatch();
        return undefined as callUpdateSuper;
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
        } catch {
            if (this.previous != null) {
                for (const key of keys) {
                    this[key] = this.previous.get(key);
                }
            }
        }
    }
}