import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from "../../editor/EditorSignals";
import { DatabaseLike, GeometryDatabase } from "../../editor/GeometryDatabase";
import MaterialDatabase from "../../editor/MaterialDatabase";
import { Snap, TanTanSnap } from "../../editor/snaps/Snap";
import { point2point } from "../../util/Conversion";
import { GeometryFactory, ValidationError } from '../GeometryFactory';

const curveMinimumPoints = new Map<c3d.SpaceType, number>();
curveMinimumPoints.set(c3d.SpaceType.Polyline3D, 2);
curveMinimumPoints.set(c3d.SpaceType.Hermit3D, 2);
curveMinimumPoints.set(c3d.SpaceType.Bezier3D, 2);
curveMinimumPoints.set(c3d.SpaceType.Nurbs3D, 4);
curveMinimumPoints.set(c3d.SpaceType.CubicSpline3D, 3);

export default class CurveFactory extends GeometryFactory {
    readonly points = new Array<THREE.Vector3>();
    type = c3d.SpaceType.Hermit3D;
    closed = false;
    style = 0;

    get startPoint() { return this.points[0] }

    async calculate() {
        const { points, type, style } = this;

        if (!this.hasEnoughPoints) throw new ValidationError(`${points.length} points is too few points for ${c3d.SpaceType[type]}`);

        const cartPoints = points.map(p => point2point(p));
        const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, this.closed, type);

        const instance = new c3d.SpaceInstance(curve);
        instance.SetStyle(style);
        return instance;
    }

    get hasEnoughPoints() {
        const { type, points: { length } } = this;

        if (length === 0) return false;
        if (length === 1) return false;
        if (length < curveMinimumPoints.get(type)!) return false;
        return true;
    }

    wouldBeClosed(p: THREE.Vector3) {
        return this.points.length >= 2 && p.manhattanDistanceTo(this.startPoint) < 10e-6;
    }

    set last(point: THREE.Vector3) {
        this.points[this.points.length - 1] = point;
        if (this.wouldBeClosed(point)) this.closed = closed;
    }

    get last() {
        return this.points[this.points.length - 1];
    }

    push(point: THREE.Vector3) {
        this.points.push(point);
    }

    temp?: THREE.Vector3;
    set snap(snap: Snap) {
        const points = this.points;
        if (points.length > 2) {
            this.temp = undefined;
            return;
        }
        if (snap instanceof TanTanSnap) {
            if (this.temp === undefined) this.temp = points[points.length - 2];
            points[points.length - 2] = snap.point1;
        } else if (this.temp !== undefined) {
            points[this.points.length - 2] = this.temp;
            this.temp = undefined;
        }
    }
}

export class CurveWithPreviewFactory extends GeometryFactory {
    readonly underlying = new CurveFactory(this.db, this.materials, this.signals);
    readonly preview = new CurveFactory(this.db, this.materials, this.signals);

    constructor(
        protected readonly db: DatabaseLike,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) {
        super(db, materials, signals);
        this.preview.style = 1;
        this.preview.push(new THREE.Vector3());
    }

    set type(t: c3d.SpaceType) {
        this.underlying.type = t;
        this.preview.type = t;
    }

    undo() {
        const { underlying, preview } = this;

        const last = preview.points.pop()!;
        preview.points.pop();
        preview.points.push(last);

        underlying.points.pop();
    }

    get canBeClosed() {
        return this.underlying.points.length >= 3;
    }

    get startPoint() { return this.underlying.startPoint }

    wouldBeClosed(p: THREE.Vector3) {
        return this.underlying.wouldBeClosed(p);
    }

    set closed(c: boolean) {
        this.underlying.closed = c;
    }

    push(p: THREE.Vector3) {
        this.underlying.points.push(p);
        this.preview.last = p;
        this.preview.push(p.clone());
        this.preview.temp = undefined;
    }

    set snap(snap: Snap) {
        this.underlying.snap = snap;
    }

    async doUpdate() {
        const promises = [this.preview.update(), this.underlying.update()];
        await Promise.all(promises);
        return Promise.resolve([]);
    }

    doCommit() {
        return this.underlying.commit();
    }

    doCancel() {
        this.underlying.cancel();
        this.preview.cancel();
    }
}