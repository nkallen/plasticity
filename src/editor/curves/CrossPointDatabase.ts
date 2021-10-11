import c3d from '../../../build/Release/c3d.node';
import { point2point } from '../../util/Conversion';
import { DatabaseLike } from "../GeometryDatabase";
import { CrossPointMemento, MementoOriginator } from '../History';
import * as visual from "../VisualModel";
import { PointOnCurve, Transaction } from './ContourManager';

export class CrossPoint {
    constructor(
        readonly position: THREE.Vector3,
        readonly on1: PointOnCurve,
        readonly on2: PointOnCurve
    ) { }
}

export class CrossPointDatabase implements MementoOriginator<CrossPointMemento> {
    private readonly curve2touched = new Map<c3d.SimpleName, Set<c3d.SimpleName>>();
    private readonly id2cross = new Map<c3d.SimpleName, Set<CrossPoint>>();
    private readonly _crosses: Set<CrossPoint> = new Set();
    get crosses(): ReadonlySet<CrossPoint> { return this._crosses }

    constructor(private readonly db: DatabaseLike) { }

    private cascade(curve: visual.SpaceInstance<visual.Curve3D>, transaction: Transaction = { dirty: new Set(), removed: new Set(), added: new Set() }) {
        const { curve2touched } = this;
        const { dirty, removed: deleted, added } = transaction;

        deleted.add(curve.simpleName);

        const touched = curve2touched.get(curve.simpleName)!;

        const visited = dirty;
        let walk = [...touched];
        while (walk.length > 0) {
            const touchee = walk.pop()!;
            if (visited.has(touchee)) continue;

            visited.add(touchee);
            walk = walk.concat([...curve2touched.get(touchee)!]);
        }

        return transaction;
    }

    add(newCurve: visual.SpaceInstance<visual.Curve3D>) {
        const { db, curve2touched, _crosses: allCrosses, id2cross } = this;

        const { crosses: newCrosses, touched } = this.calculate(newCurve);

        id2cross.set(newCurve.simpleName, new Set());
        curve2touched.set(newCurve.simpleName, touched);

        for (const cross of newCrosses) {
            id2cross.get(cross.on1.curve)!.add(cross);
            id2cross.get(cross.on2.curve)!.add(cross);
            allCrosses.add(cross);
        }
    }

    calculate(newCurve: visual.SpaceInstance<visual.Curve3D>): { crosses: Set<CrossPoint>, touched: Set<c3d.SimpleName> } {
        const { db } = this;
        const touched = new Set<c3d.SimpleName>();

        const inst = db.lookup(newCurve);
        const curve = inst.GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

        const crosses = new Set<CrossPoint>();
        const allCurves = [...this.curve2touched.keys()].map(id => db.lookupItemById(id)) as { view: visual.SpaceInstance<visual.Curve3D>; model: c3d.SpaceInstance }[];
        for (const { view, model } of allCurves) {
            const other = model.GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const { count, result1, result2 } = c3d.ActionPoint.CurveCurveIntersection3D(curve, other, 10e-3,)
            if (count > 0) {
                touched.add(view.simpleName);
                for (let i = 0; i < count; i++) {
                    const position = curve.PointOn(result1[i]);
                    const cross = new CrossPoint(
                        point2point(position),
                        new PointOnCurve(newCurve.simpleName, result1[i], curve.GetTMin(), curve.GetTMax()),
                        new PointOnCurve(view.simpleName, result2[i], other.GetTMin(), other.GetTMax()));
                    crosses.add(cross);
                }
            }
        }
        return { crosses, touched };
    }

    commit(data: Transaction) {
        for (const touchee of data.dirty) {
            this.removeInfo(touchee);
        }
        for (const touchee of data.removed) {
            if (data.dirty.has(touchee)) continue;

            this.removeInfo(touchee);
        }
        for (const touchee of data.dirty) {
            if (data.removed.has(touchee)) continue;

            const inst = this.db.lookupItemById(touchee).view as visual.SpaceInstance<visual.Curve3D>;
            this.add(inst);
        }
        for (const touchee of data.added) {
            if (data.removed.has(touchee)) continue;
            if (data.dirty.has(touchee)) continue;

            const inst = this.db.lookupItemById(touchee).view as visual.SpaceInstance<visual.Curve3D>;
            this.add(inst);
        }

        return;
    }

    remove(curve: visual.SpaceInstance<visual.Curve3D>) {
        const data = this.cascade(curve);
        this.commit(data);
    }

    private removeInfo(id: c3d.SimpleName) {
        const { curve2touched, id2cross: id2joint, _crosses: joints } = this;
        curve2touched.delete(id);
        const invalidatedJoints = id2joint.get(id)!;
        for (const joint of invalidatedJoints) {
            joints.delete(joint);
        }
        id2joint.delete(id);
    }

    validate() { }

    saveToMemento(): CrossPointMemento {
        return new CrossPointMemento(
            new Map(this.curve2touched),
            new Map(this.id2cross),
            new Set(this.crosses)
        );
    }

    restoreFromMemento(m: CrossPointMemento) {
        (this.curve2touched as CrossPointDatabase['curve2touched']) = m.curve2touched;
        (this.id2cross as CrossPointDatabase['id2cross']) = m.id2cross;
        (this._crosses as CrossPointDatabase['crosses']) = m.crosses;
    }

    serialize(): Promise<Buffer> {
        throw new Error('Method not implemented.');
    }
    deserialize(data: Buffer): Promise<void> {
        throw new Error('Method not implemented.');
    }
    debug(): void {
        throw new Error('Method not implemented.');
    }
}