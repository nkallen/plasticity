import { GeometryDatabase } from "../GeometryDatabase";
import c3d from '../build/Release/c3d.node';
import * as visual from '../VisualModel';

abstract class AbstractSelection<T extends visual.Item | visual.TopologyItem, S extends c3d.SimpleName | string> {
    size: number;

    constructor(
        protected readonly db: GeometryDatabase,
        private readonly ids: ReadonlySet<S>
    ) {
        this.size = ids.size;
    }

    *[Symbol.iterator]() {
        for (const id of this.ids) {
            yield this.lookupById(id) as T;
        }
    }

    get first() { return this[Symbol.iterator]().next().value as T || undefined }

    has(s: T) { return this.ids.has(s.userData.simpleName) }

    abstract lookupById(id: S): T;
}

export class ItemSelection<T extends visual.Item> extends AbstractSelection<T, c3d.SimpleName> {
    lookupById(id: c3d.SimpleName) {
        return this.db.lookupItemById(id).visual as T;
    }
}

export class TopologyItemSelection<T extends visual.TopologyItem> extends AbstractSelection<T, string> {
    lookupById(id: string) {
        return this.db.lookupTopologyItemById(id).visual.values().next().value;
    }
}