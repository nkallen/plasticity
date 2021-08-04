import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from "../editor/EditorSignals";
import * as visual from "../editor/VisualModel";
import { PlanarCurveDatabase, RegionManager } from '../editor/PlanarCurveDatabase';

export class CurveInfo {
    readonly touched = new Set<visual.SpaceInstance<visual.Curve3D>>();
    fragments = new Array<Promise<visual.Item>>();
    readonly joints = new Joints();
    constructor(readonly planarCurve: c3d.Curve, readonly placement: c3d.Placement3D) { }
}

export type Curve2dId = bigint;
export type Trim = { trimmed: c3d.Curve, start: number, stop: number };
export type Transaction = { dirty: CurveSet, added: CurveSet, deleted: CurveSet }
type CurveSet = Set<visual.SpaceInstance<visual.Curve3D>>;
type State = { tag: 'none' } | { tag: 'transaction', transaction: Transaction }

export default class ContourManager {
    private state: State = { tag: 'none' };

    constructor(
        private readonly curves: PlanarCurveDatabase,
        private readonly regions: RegionManager,
        signals: EditorSignals,
    ) {
        // The order is important, because add creates info update subsequently uses;
        signals.userAddedCurve.add(c => this.add(c));
        signals.userAddedCurve.add(c => this.update(c));

        // Similarly, don't delete info necessary for update
        signals.userRemovedCurve.add(c => this.update(c));
        signals.userRemovedCurve.add(c => this.remove(c));
    }

    update(changed: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none': this.regions.updateCurve(changed); break;
            case 'transaction': break;
        }
    }

    remove(curve: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none': {
                const data = this.curves.cascade(curve);
                return this.curves.commit(data);
            }
            case 'transaction': {
                this.curves.cascade(curve, this.state.transaction);
            }
        }
    }

    add(curve: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none':
                const result = this.curves.add(curve);
                return result;
            case 'transaction':
                this.state.transaction.added.add(curve);
                break;
        }
    }

    async transaction(f: () => Promise<void>) {
        switch (this.state.tag) {
            case 'none': {
                const transaction: Transaction = { dirty: new Set(), added: new Set(), deleted: new Set() };
                this.state = { tag: 'transaction', transaction: transaction};
                try {
                    await f();
                    await this.curves.commit(transaction);
                    if (transaction.dirty.size > 0 || transaction.added.size > 0 || transaction.deleted.size > 0) {
                        for (const placement of this.state2placement(transaction)) {
                            await this.regions.updatePlacement(placement);
                        }
                    }
                } finally {
                    this.state = { tag: 'none' };
                }
                return;
            }
            default: throw new Error("invalid state");
        }
    }

    private state2placement(state: Transaction) {
        const { dirty, added, deleted } = state;
        const all = [];
        for (const d of dirty) all.push(d);
        for (const a of added) all.push(a);
        for (const d of deleted) all.push(d);

        const placements = [];
        for (const c of all) {
            const info = this.curves.lookup(c);
            if (info !== undefined) placements.push(info.placement);
        }

        const result = [];
        candidates: while (placements.length > 0) {
            const candidate = placements.pop()!;
            if (result.length === 0) result.push(candidate);
            else {
                already: for (const p of result)
                    if (p.GetAxisZ().Colinear(candidate.GetAxisZ()))
                        continue candidates;
                result.push(candidate);
            }
        }
        return result;
    }
}

export class PointOnCurve {
    constructor(
        readonly curve: visual.SpaceInstance<visual.Curve3D>,
        readonly t: number,
        readonly tmin: number,
        readonly tmax: number
    ) { }

    get isTmin() { return this.t === this.tmin }
    get isTmax() { return this.t === this.tmax }
}

export class Joint {
    constructor(
        readonly on1: PointOnCurve,
        readonly on2: PointOnCurve
    ) { }
}

class Joints {
    constructor(public start?: Joint, public stop?: Joint) { }
}
