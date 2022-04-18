import * as c3d from '../kernel/kernel';
import { DatabaseLike } from "../editor/DatabaseLike";
import { GroupId, Group } from '../editor/Groups';
import { GConstructor } from '../util/Util';
import * as visual from '../visual_model/VisualModel';

export abstract class TypedSelection<T extends visual.Item | visual.TopologyItem | visual.ControlPoint | Group, S extends c3d.SimpleName | string | GroupId> {
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

    // FIXME: : T | undefined
    get first() { return this[Symbol.iterator]().next().value as T }
    get last(): T | undefined {
        if (this.ids.size < 1) return;
        const lastId = [...this.ids][this.ids.size - 1];
        return this.lookupById(lastId);
    }

    has(s: T) { return this.ids.has(s.simpleName as unknown as any) }

    abstract lookupById(id: S): T;

    concat(that: this): this {
        return new (this.constructor as GConstructor<this>)(this.db, new Set([...this.ids, ...that.ids]));
    }

    clone() {
        return new (this.constructor as GConstructor<this>)(this.db, new Set([...this.ids]));
    }
}

export class ItemSelection<T extends visual.Item> extends TypedSelection<T, c3d.SimpleName> {
    lookupById(id: c3d.SimpleName) {
        return this.db.lookupItemById(id).view as T;
    }

    get models() {
        const result = [];
        for (const id of this.ids) {
            result.push(this.db.lookupItemById(id).model);
        }
        return result;
    }
}

export class TopologyItemSelection<T extends visual.TopologyItem> extends TypedSelection<T, string> {
    lookupById(id: string) {
        const views = [...this.db.lookupTopologyItemById(id).views];
        return views[views.length - 1] as T;
    }
}
export class ControlPointSelection extends TypedSelection<visual.ControlPoint, string> {
    lookupById(id: string) {
        return this.db.lookupControlPointById(id).views.values().next().value;
    }
}

export class GroupSelection extends TypedSelection<Group, GroupId> {
    lookupById(id: GroupId) {
        return new Group(id);
    }
}

export type SolidSelection = ItemSelection<visual.Solid>;
export type RegionSelection = ItemSelection<visual.PlaneInstance<visual.Region>>;
export type CurveSelection = ItemSelection<visual.SpaceInstance<visual.Curve3D>>;
export type FaceSelection = TopologyItemSelection<visual.Face>;
export type EdgeSelection = TopologyItemSelection<visual.CurveEdge>;
