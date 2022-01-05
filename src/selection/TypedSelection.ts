import c3d from '../build/Release/c3d.node';
import { DatabaseLike } from "../editor/GeometryDatabase";
import { GConstructor } from '../util/Util';
import * as visual from '../visual_model/VisualModel';

export abstract class TypedSelection<T extends visual.Item | visual.TopologyItem | visual.ControlPoint, S extends c3d.SimpleName | string> {
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

export type SolidSelection = ItemSelection<visual.Solid>;
export type RegionSelection = ItemSelection<visual.PlaneInstance<visual.Region>>;
export type CurveSelection = ItemSelection<visual.SpaceInstance<visual.Curve3D>>;
export type FaceSelection = TopologyItemSelection<visual.Face>;
export type EdgeSelection = TopologyItemSelection<visual.Edge>;
