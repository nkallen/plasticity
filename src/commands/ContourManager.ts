import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from "../editor/EditorSignals";
import { GeometryDatabase } from '../editor/GeometryDatabase';
import * as visual from "../editor/VisualModel";

// FIXME we need to aggregate by placement
// FIXME no undo

class CurveInfo {
    touched = new Set<visual.SpaceInstance<visual.Curve3D>>();
    fragments = new Array<Promise<visual.Item>>();
    joint?: Joint;
    constructor(readonly planarCurve: c3d.Curve) { }
}

type Curve2dId = bigint;
type Trim = { trimmed: c3d.Curve, start: number, stop: number };

type CurveSet = Set<visual.SpaceInstance<visual.Curve3D>>;
type State = { tag: 'none' } | { tag: 'transaction', dirty: CurveSet, added: CurveSet, deleted: CurveSet }

export default class ContourManager {
    private readonly curve2info = new Map<visual.SpaceInstance<visual.Curve3D>, CurveInfo>();
    private readonly planar2instance = new Map<Curve2dId, visual.SpaceInstance<visual.Curve3D>>();

    private state: State = { tag: 'none' };

    constructor(
        private readonly db: GeometryDatabase,
        signals: EditorSignals
    ) {
        this.add = this.add.bind(this);
        this.remove = this.remove.bind(this);
        this.update = this.update.bind(this);

        signals.userAddedCurve.add(this.add);
        signals.userRemovedCurve.add(this.remove);
        signals.userAddedCurve.add(this.update);
        signals.userRemovedCurve.add(this.update);
    }

    private _update() {
        return this.db.queue.enqueue(async () => {
            const oldRegions = this.db.find(visual.PlaneInstance) as visual.PlaneInstance<visual.Region>[];
            for (const region of oldRegions) this.db.removeItem(region, 'automatic');

            const { curve2info } = this;
            const allPlanarCurves = [...curve2info.values()].map(info => info.planarCurve);
            const placement = new c3d.Placement3D();
            const { contours } = c3d.ContourGraph.OuterContoursBuilder(allPlanarCurves);

            const regions = c3d.ActionRegion.GetCorrectRegions(contours, false);
            for (const region of regions) {
                this.db.addItem(new c3d.PlaneInstance(region, placement), 'automatic');
            }
       });
    }

    update() {
        switch (this.state.tag) {
            case 'none': {
                return this._update();
            }
            case 'transaction': break;
        }
    }

    private removeInfo(curve: visual.SpaceInstance<visual.Curve3D>, invalidateCurvesThatTouch = true) {
        const { curve2info, planar2instance } = this;
        
        const info = curve2info.get(curve);
        if (info === undefined) return;
        curve2info.delete(curve);
        
        const { fragments, planarCurve } = info;

        planar2instance.delete(planarCurve.Id());

        for (const fragment of fragments) {
            fragment.then(f => this.db.removeItem(f, 'automatic'));
        }
        return info;
    }

    private cascade(curve: visual.SpaceInstance<visual.Curve3D>) {
        if (this.state.tag !== 'transaction') throw new Error("invalid state");
        this.state.deleted.add(curve);

        const { curve2info } = this;

        const info = curve2info.get(curve);
        if (info === undefined) return;
        const { touched } = info;

        const visited = this.state.dirty;
        let walk = [...touched];
        while (walk.length > 0) {
            const touchee = walk.pop()!;
            if (visited.has(touchee)) continue;
            visited.add(touchee);
            walk = walk.concat([...curve2info.get(touchee)!.touched]);
        }
    }

    remove(curve: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none': {
                this.state = { tag: 'transaction', dirty: new Set(), added: new Set(), deleted: new Set() };
                this.cascade(curve);
                const result = this.commit();
                this.state = { tag: 'none' };
                return result;
            }
            case 'transaction': {
                this.cascade(curve);
            }
        }
    }


    add(curve: visual.SpaceInstance<visual.Curve3D>) {
        switch (this.state.tag) {
            case 'none': {
                this.state = { tag: 'transaction', dirty: new Set(), added: new Set(), deleted: new Set() };
                const result = this._add(curve);
                this.state = { tag: 'none' };
                return result;
            }
            case 'transaction': {
                return this.state.added.add(curve);
            }
        }
    }

    async transaction(f: () => Promise<void>) {
        switch (this.state.tag) {
            case 'none': {
                this.state = { tag: 'transaction', dirty: new Set(), added: new Set(), deleted: new Set() };
                try {
                    await f();
                    await this.commit();
                    if (this.state.dirty.size > 0 || this.state.added.size > 0 || this.state.deleted.size > 0) {
                        await this._update();
                    }
                } finally {
                    this.state = { tag: 'none' };
                }
                return;
            }
            default: throw new Error("invalid state");
        }
    }

    private commit() {
        if (this.state.tag !== 'transaction') throw new Error("invalid state");

        const promises = [];
        for (const touchee of this.state.dirty) {
            this.removeInfo(touchee);
        }
        for (const touchee of this.state.deleted) {
            if (this.state.dirty.has(touchee)) continue;
            this.removeInfo(touchee);
        }
        for (const touchee of this.state.dirty) {
            if (this.state.deleted.has(touchee)) continue;
            promises.push(this._add(touchee));
        }
        for (const touchee of this.state.added) {
            if (this.state.deleted.has(touchee)) continue;
            if (this.state.dirty.has(touchee)) continue;
            promises.push(this._add(touchee));
        }

        return Promise.all(promises);
    }

    /**
     * Summary of algorithm: to add a new curve, with find its intersections with all other curves.
     * Suppose there's one intersection along the parameter of the curve at i. This intersection
     * cuts the curve in two. Thus we trim curve from [0,i], and [i,1], assuming 0 and 1 are tmin and
     * tmax. Then we process the next curve (the one we intersected with earlier), since it also has
     * been cut in two.
     * 
     * There are a lot of edge cases, for circular curves, for curves whose endpoints intersect the
     * startpoints of the next curve, etc. etc.
     */
    _add(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        if (this.state.tag !== 'transaction') throw new Error("invalid state");

        const { curve2info, planar2instance } = this;
        const promises = [];

        const inst = this.db.lookup(newCurve);
        const item = inst.GetSpaceItem()!;
        const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
        const newPlanarCurve = this.curve3d2curve2d(curve3d);
        if (newPlanarCurve === undefined) return;

        const info = new CurveInfo(newPlanarCurve);
        curve2info.set(newCurve, info);
        planar2instance.set(newPlanarCurve.Id(), newCurve);

        const allPlanarCurves = [...curve2info.values()].map(info => info.planarCurve);
        const curvesToProcess = new Map<Curve2dId, c3d.Curve>();
        curvesToProcess.set(newPlanarCurve.Id(), newPlanarCurve);
        const visited = new Set<Curve2dId>();

        while (curvesToProcess.size > 0) {
            const [id, current] = curvesToProcess.entries().next().value;
            visited.add(id);
            curvesToProcess.delete(id);

            const crosses = c3d.CurveEnvelope.IntersectWithAll(current, allPlanarCurves, true);
            if (crosses.length === 0) {
                promises.push(this.updateCurve(newCurve, [{ trimmed: newPlanarCurve, start: -1, stop: -1 }]));
                continue;
            }
            crosses.sort((a, b) => a.on1.t - b.on1.t);

            const { on1: { curve: curve1, t: t1 }, on2: { curve: curve2, t: t2 } } = crosses[0];
            const view1 = this.planar2instance.get(curve1.Id())!;
            const view2 = this.planar2instance.get(curve2.Id())!;
            const info = curve2info.get(view1)!;

            if (t1 === curve1.GetTMin()) {
                const on1_ = new PointOnCurve(view1, t1);
                const on2_ = new PointOnCurve(view2, t2);
                info.joint = new Joint(on1_, on2_);
            }

            // For bounded (finite) open curves (like line segments), we need to add in the beginning and end points
            if (current.IsBounded() && !current.IsClosed()) {
                const begPointOn = new c3d.PointOnCurve(current.GetTMin(), current);
                const begCrossPoint = new c3d.CrossPoint(current.GetLimitPoint(1), begPointOn, begPointOn);
                crosses.unshift(begCrossPoint);

                const endPointOn = new c3d.PointOnCurve(current.GetTMax(), current);
                const endCrossPoint = new c3d.CrossPoint(current.GetLimitPoint(2), endPointOn, endPointOn);
                crosses.push(endCrossPoint);
            } else if (current.IsClosed()) { // And for closed/looping curves we need to add a point
                crosses.push(crosses[0]);
            }

            // The crosses (intersections) are sorted, so each t[i] (start) to t[i+1] (stop) section of the curve is a cuttable.
            let start = crosses[0].on1.t;
            const result: Trim[] = [];
            for (const cross of crosses) {
                const { on1: { t }, on2: { curve: other } } = cross;
                const otherId = other.Id();

                info.touched.add(this.planar2instance.get(otherId)!);

                const stop = t;
                if (Math.abs(start - stop) > 10e-6) {
                    const trimmed = curve1.Trimmed(start, stop, 1)!;
                    result.push({ trimmed, start, stop });
                }
                start = stop;

                if (!visited.has(otherId)) {
                    curvesToProcess.set(otherId, other);
                }
            }
            promises.push(this.updateCurve(this.planar2instance.get(id)!, result));
        }
        return Promise.all(promises);
    }

    private updateCurve(instance: visual.SpaceInstance<visual.Curve3D>, result: Trim[]) {
        const { curve2info, db } = this;
        const info = curve2info.get(instance)!;
        for (const invalid of info.fragments) {
            invalid.then(i => db.removeItem(i, 'automatic'));
        }
        const placement = new c3d.Placement3D();
        const views: Promise<visual.Item>[] = [];
        for (const { trimmed, start, stop } of result) {
            const inst = new c3d.SpaceInstance(new c3d.PlaneCurve(placement, trimmed, true));
            const p = db.addItem(inst, 'automatic').then(item => {
                item.layers.set(visual.Layers.CurveFragment);
                item.traverse(c => c.layers.set(visual.Layers.CurveFragment));
                item.userData.start = start;
                item.userData.stop = stop;
                item.userData.parentItem = instance;
                return item;
            });
            views.push(p);
        }
        info.fragments = views;
        return Promise.all(views);
    }

    private curve3d2curve2d(curve: c3d.Curve3D): c3d.Curve | undefined {
        const placement_ = new c3d.Placement3D();

        if (curve.IsStraight(true)) {
            if (!(curve instanceof c3d.PolyCurve3D)) throw new Error("invalid precondition");
            const points2d = [];
            for (const point of curve.GetPoints()) {
                if (placement_.PointRelative(point) !== c3d.ItemLocation.OnItem) return;
                const { x, y } = placement_.PointProjection(point);
                points2d.push(new c3d.CartPoint(x, y));
            }
            return c3d.ActionCurve.SplineCurve(points2d, false, c3d.PlaneType.Polyline);
        } else if (curve.IsPlanar()) {
            const { curve2d, placement } = curve.GetPlaneCurve(false, new c3d.PlanarCheckParams(0.1));

            // Apply an 2d placement to the curve, so that any future booleans work
            const matrix = placement.GetMatrixToPlace(placement_);
            curve2d.Transform(matrix);

            return curve2d;
        } else {
        }
    }

    lookup(instance: visual.SpaceInstance<visual.Curve3D>) {
        return this.curve2info.get(instance)!;
    }
}


export class PointOnCurve {
    constructor(
        readonly curve: visual.SpaceInstance<visual.Curve3D>,
        readonly t: number
    ) { }
}

export class Joint {
    constructor(
        readonly on1: PointOnCurve,
        readonly on2: PointOnCurve
    ) { }
}