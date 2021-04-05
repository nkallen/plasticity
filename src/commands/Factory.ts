import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';

type callUpdateSuper = never;
type callCommitSuper = never;

export abstract class GeometryFactory {
    constructor(
        protected readonly db: GeometryDatabase,
        protected readonly materialDb: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) {}

    update(): callUpdateSuper {
        this.signals.commandUpdated.dispatch();
        return undefined as callUpdateSuper;
    }

    commit(): callCommitSuper {
        this.signals.commandUpdated.dispatch();
        return undefined as callUpdateSuper;
    }
}