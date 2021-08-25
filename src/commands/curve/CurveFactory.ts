import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from "../../editor/EditorSignals";
import { GeometryDatabase } from "../../editor/GeometryDatabase";
import MaterialDatabase from "../../editor/MaterialDatabase";
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

        const cartPoints = points.map(p => new c3d.CartPoint3D(p.x, p.y, p.z));
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
    }

    get last() {
        return this.points[this.points.length - 1];
    }

    push(point: THREE.Vector3) {
        this.points.push(point);
    }
}

export class CurveWithPreviewFactory extends GeometryFactory {
    readonly underlying = new CurveFactory(this.db, this.materials, this.signals);
    readonly preview = new CurveFactory(this.db, this.materials, this.signals);

    constructor(
        protected readonly db: GeometryDatabase,
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
        this.underlying.points.pop();
        this.preview.points.pop();
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
        this.preview.push(new THREE.Vector3());
    }

    doUpdate() {
        if (this.preview.hasEnoughPoints) this.preview.update();
        if (this.underlying.hasEnoughPoints) this.underlying.update();
        return Promise.resolve();
    }

    doCommit() {
        return this.underlying.commit();
    }

    doCancel() {
        this.underlying.cancel();
        this.preview.cancel();
    }
}