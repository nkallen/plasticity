import { CurveMemento } from './History';
import c3d from '../../build/Release/c3d.node';
import { GeometryDatabase } from './GeometryDatabase';
import * as visual from "./VisualModel";
import { curve3d2curve2d, normalizePlacement } from '../util/Conversion';
import { CurveInfo, Curve2dId, Transaction, Trim, PointOnCurve, Joint } from '../commands/ContourManager';

export class PlanarCurveDatabase {
    private readonly curve2info = new Map<visual.SpaceInstance<visual.Curve3D>, CurveInfo>();
    private readonly planar2instance = new Map<Curve2dId, visual.SpaceInstance<visual.Curve3D>>();
    private readonly placements = new Set<c3d.Placement3D>();

    constructor(
        private readonly db: GeometryDatabase
    ) {
        const origin = new c3d.CartPoint3D(0, 0, 0);
        const X = new c3d.Vector3D(1, 0, 0);
        const Y = new c3d.Vector3D(0, 1, 0);
        const Z = new c3d.Vector3D(0, 0, 1);
        this.placements.add(new c3d.Placement3D(origin, Z, X, false));
    }

    update(changed: visual.SpaceInstance<visual.Curve3D>): Promise<void> {
        const info = this.curve2info.get(changed)!;
        const placement = info.placement;
        return this._update(placement);
    }

    _update(placement: c3d.Placement3D): Promise<void> {
        return this.db.queue.enqueue(async () => {
            const { curve2info } = this;

            // First remove all old regions that are coplanar
            const oldRegions = this.db.find(visual.PlaneInstance);
            for (const { model, view } of oldRegions) {
                const p = model.GetPlacement();
                if (placement.GetAxisZ().Colinear(p.GetAxisZ())) {
                    this.db.removeItem(view, 'automatic');
                }
            }

            // Then, collect all coplanar curves,
            const coplanarCurves = [];
            let normalizedPlacement = placement;
            for (const info of curve2info.values()) {
                if (info.placement.GetAxisZ().Colinear(placement.GetAxisZ())) {
                    coplanarCurves.push(info.planarCurve);
                    normalizedPlacement = info.placement;
                }
            }

            // Assemble regions
            const { contours } = c3d.ContourGraph.OuterContoursBuilder(coplanarCurves);

            const regions = c3d.ActionRegion.GetCorrectRegions(contours, false);
            for (const region of regions) {
                this.db.addItem(new c3d.PlaneInstance(region, normalizedPlacement), 'automatic');
            }
        });
    }

    private removeInfo(curve: visual.SpaceInstance<visual.Curve3D>, invalidateCurvesThatTouch = true) {
        const { curve2info, planar2instance } = this;

        const info = curve2info.get(curve);
        if (info === undefined)
            return;
        curve2info.delete(curve);

        const { fragments, planarCurve } = info;

        planar2instance.delete(planarCurve.Id());

        for (const fragment of fragments) {
            fragment.then(f => this.db.removeItem(f, 'automatic'));
        }
        return info;
    }

    cascade(curve: visual.SpaceInstance<visual.Curve3D>, transaction: Transaction = { dirty: new Set(), deleted: new Set(), added: new Set() }) {
        const { dirty, deleted, added } = transaction;

        deleted.add(curve);

        const { curve2info } = this;

        const info = curve2info.get(curve);
        if (info === undefined)
            return transaction;
        const { touched } = info;

        const visited = dirty;
        let walk = [...touched];
        while (walk.length > 0) {
            const touchee = walk.pop()!;
            if (visited.has(touchee))
                continue;
            visited.add(touchee);
            walk = walk.concat([...curve2info.get(touchee)!.touched]);
        }

        return transaction;
    }

    commit(data: Transaction) {
        const promises = [];
        for (const touchee of data.dirty) {
            this.removeInfo(touchee);
        }
        for (const touchee of data.deleted) {
            if (data.dirty.has(touchee))
                continue;
            this.removeInfo(touchee);
        }
        for (const touchee of data.dirty) {
            if (data.deleted.has(touchee))
                continue;
            promises.push(this.add(touchee));
        }
        for (const touchee of data.added) {
            if (data.deleted.has(touchee))
                continue;
            if (data.dirty.has(touchee))
                continue;
            promises.push(this.add(touchee));
        }

        return Promise.all(promises);
    }

    /**
     * Summary of algorithm: to add a new curve, first find its intersections with all other curves.
     * Now, suppose there's one intersection along the parameter of the curve at i. This intersection
     * cuts the curve in two. Thus we trim curve from [0,i], and [i,1], assuming 0 and 1 are tmin and
     * tmax. Then we process the next curve (the one we intersected with earlier), since it also has
     * been cut in two.
     *
     * There are a lot of edge cases, e.g., circular (closed) curves, curves whose endpoints intersect the
     * startpoints of the next curve (a "joint"), etc. etc.
     */
    add(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        const { curve2info, planar2instance } = this;

        const inst = this.db.lookup(newCurve);
        const item = inst.GetSpaceItem()!;
        const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
        const planarInfo = this.planarizeAndNormalize(curve3d);
        if (planarInfo === undefined)
            return;
        const { curve: newPlanarCurve, placement } = planarInfo;

        const info = new CurveInfo(newPlanarCurve, placement);
        curve2info.set(newCurve, info);
        planar2instance.set(newPlanarCurve.Id(), newCurve);

        const allPlanarCurves = [...curve2info.values()].map(info => info.planarCurve);
        const curvesToProcess = new Map<Curve2dId, c3d.Curve>();
        curvesToProcess.set(newPlanarCurve.Id(), newPlanarCurve);
        const visited = new Set<Curve2dId>();

        const promises = [];
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

            const { on1: { curve: curve1 } } = crosses[0];
            const view1 = this.planar2instance.get(curve1.Id())!;
            const info = curve2info.get(view1)!;

            // For bounded (finite) open curves (like line segments), we need to add in the beginning and end points
            if (current.IsBounded() && !current.IsClosed()) {
                this.addJoint(crosses[0]);
                this.addJoint(crosses[crosses.length - 1]);

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

    remove(curve: visual.SpaceInstance<visual.Curve3D>) {
        const data = this.cascade(curve);
        return this.commit(data);
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
                for (const curve of item.levels)
                    curve.befragment(start, stop, instance);
                return item;
            });
            views.push(p);
        }
        info.fragments = views;
        return Promise.all(views);
    }

    private planarizeAndNormalize(curve3d: c3d.Curve3D): { curve: c3d.Curve; placement: c3d.Placement3D; } | undefined {
        const hint = new c3d.Placement3D();
        const planar = curve3d2curve2d(curve3d, hint);
        if (planar === undefined)
            return;
        const { curve, placement } = planar;
        const bestExistingPlacement = normalizePlacement(curve, placement, this.placements);
        return { curve, placement: bestExistingPlacement };
    }

    lookup(instance: visual.SpaceInstance<visual.Curve3D>): Readonly<CurveInfo> {
        return this.curve2info.get(instance)!;
    }

    private addJoint(cross: c3d.CrossPoint) {
        const { on1: { curve: curve1, t: t1 }, on2: { curve: curve2, t: t2 } } = cross;
        const view1 = this.planar2instance.get(curve1.Id())!;
        const view2 = this.planar2instance.get(curve2.Id())!;
        const info1 = this.curve2info.get(view1)!;
        const info2 = this.curve2info.get(view2)!;

        const t1min = curve1.GetTMin();
        const t1max = curve1.GetTMax();
        const t2min = curve2.GetTMin();
        const t2max = curve2.GetTMax();

        if (t1 !== t1min && t1 !== t1max)
            return;

        const on1 = new PointOnCurve(view1, t1, t1min, t1max);
        const on2 = new PointOnCurve(view2, t2, t2min, t2max);

        if (t1 === curve1.GetTMin())
            info1.joints.start = new Joint(on1, on2);

        else
            info1.joints.stop = new Joint(on1, on2);

        if (t2 === curve2.GetTMin())
            info2.joints.start = new Joint(on2, on1);
        else if (t2 === curve2.GetTMax())
            info2.joints.stop = new Joint(on2, on1);
    }

    saveToMemento(registry: Map<any, any>): CurveMemento {
        return new CurveMemento(
            new Map(this.curve2info),
            new Map(this.planar2instance),
            new Set(this.placements));
    }

    restoreFromMemento(m: CurveMemento) {
        (this.curve2info as PlanarCurveDatabase['curve2info']) = m.curve2info;
        (this.planar2instance as PlanarCurveDatabase['planar2instance']) = m.planar2instance;
        (this.placements as PlanarCurveDatabase['placements']) = m.placements;
    }
}
