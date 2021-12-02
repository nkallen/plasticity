import c3d from '../build/Release/c3d.node';
import { DatabaseLike } from "../editor/GeometryDatabase";
import * as visual from '../visual_model/VisualModel';

abstract class AbstractTypedSelection<T extends visual.Item | visual.TopologyItem | visual.ControlPoint, S extends c3d.SimpleName | string> {
    size: number;

    constructor(
        protected readonly db: DatabaseLike,
        readonly ids: ReadonlySet<S>
    ) {
        this.size = ids.size;
    }

    *[Symbol.iterator]() {
        for (const id of this.ids) {
            yield this.lookupById(id) as T;
        }
    }

    get first() { return this[Symbol.iterator]().next().value as T }
    get last(): T | undefined {
        if (this.ids.size < 1) return;
        const lastId = [...this.ids][this.ids.size - 1];
        return this.lookupById(lastId);
    }

    has(s: T) { return this.ids.has(s.simpleName as unknown as any) }

    abstract lookupById(id: S): T;
}

export class ItemSelection<T extends visual.Item> extends AbstractTypedSelection<T, c3d.SimpleName> {
    lookupById(id: c3d.SimpleName) {
        return this.db.lookupItemById(id).view as T;
    }
}

export class TopologyItemSelection<T extends visual.TopologyItem> extends AbstractTypedSelection<T, string> {
    lookupById(id: string) {
        const views = [...this.db.lookupTopologyItemById(id).views];
        return views[views.length - 1] as T;
    }
}
export class ControlPointSelection extends AbstractTypedSelection<visual.ControlPoint, string> {
    lookupById(id: string) {
        return this.db.lookupControlPointById(id).views.values().next().value;
    }
}