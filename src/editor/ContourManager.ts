import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from "./EditorSignals";
import { PlanarCurveDatabase } from './PlanarCurveDatabase';
import { RegionManager } from "./RegionManager";
import * as visual from "./VisualModel";

export class CurveInfo {
    readonly touched = new Set<visual.SpaceInstance<visual.Curve3D>>();
    fragments = new Array<Promise<visual.Item>>();
    readonly joints = new Joints();
    constructor(readonly planarCurve: c3d.Curve, readonly placement: c3d.Placement3D) { }
}

export type Curve2dId = bigint;
export type Trim = { trimmed: c3d.Curve, start: number, stop: number };
export type Transaction = { dirty: CurveSet, added: CurveSet, removed: CurveSet }
type CurveSet = Set<visual.SpaceInstance<visual.Curve3D>>;
type State = { tag: 'none' } | { tag: 'transaction', transaction: Transaction }

export default class ContourManager {
    private state: State = { tag: 'none' };

    constructor(
        private readonly curves: PlanarCurveDatabase,
        private readonly regions: RegionManager,
        signals: EditorSignals,
    ) {
        signals.userAddedCurve.add(c => this.add(c));
        signals.userRemovedCurve.add(c => this.remove(c));
    }

    async remove(curve: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none':
                const info = this.curves.lookup(curve);
                const data = this.curves.cascade(curve);
                await this.curves.commit(data);
                await this.regions.updatePlacement(info.placement);
                break;
            case 'transaction':
                this.curves.cascade(curve, this.state.transaction);
        }
    }

    add(curve: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none':
                const result = this.curves.add(curve);
                const info = this.curves.lookup(curve);
                this.regions.updatePlacement(info.placement);
                return result;
            case 'transaction':
                this.state.transaction.added.add(curve);
                break;
        }
    }

    async transaction(f: () => Promise<void>) {
        switch (this.state.tag) {
            case 'none': {
                const transaction: Transaction = { dirty: new Set(), added: new Set(), removed: new Set() };
                this.state = { tag: 'transaction', transaction: transaction};
                try {
                    await f();
                    const placements = new Set<c3d.Placement3D>();
                    this.placementsAffectedByTransaction(transaction.dirty, placements);
                    this.placementsAffectedByTransaction(transaction.removed, placements);
                    await this.curves.commit(transaction);
                    this.placementsAffectedByTransaction(transaction.added, placements);
                    if (transaction.dirty.size > 0 || transaction.added.size > 0 || transaction.removed.size > 0) {
                        for (const p of placements) await this.regions.updatePlacement(p);
                    }
                } finally {
                    this.state = { tag: 'none' };
                }
                return;
            }
            default: throw new Error("invalid state");
        }
    }

    private placementsAffectedByTransaction(dirty: CurveSet, placements: Set<c3d.Placement3D>) {
        for (const c of dirty) {
            const info = this.curves.lookup(c);
            if (info !== undefined) placements.add(info.placement);
        }
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
