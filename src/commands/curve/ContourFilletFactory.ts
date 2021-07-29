import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { CancellableRegistor } from '../../util/Cancellable';
import { cart2vec, vec2vec } from '../../util/Conversion';
import ContourManager, { Joint } from '../ContourManager';
import { GeometryFactory } from '../Factory';
import LineFactory from '../line/LineFactory';
import JoinCurvesFactory from './JoinCurvesFactory';
import * as THREE from 'three';

/**
 * Filleting curves is idiosyncratic. The underlying c3d method uses Contours only. Thus, to fillet a polyline, it
 * has to be converted to a contour first. Polyline and Contours can be treated somewhat uniformly. Somewhat similarly,
 * if two distinct curves end at an intersection (called a Joint) we can also create a contour a fillet at the joint.
 * The interface for this method is somewhat different, however.
 */

interface CurveFilletFactory {
    controlPoints: number[];
    set radius(radius: number);
    get cornerAngle(): CornerAngle;
}

interface CornerAngle {
    origin: THREE.Vector3;
    tau: THREE.Vector3;
    axis: THREE.Vector3;
    angle: number;
}

export class ContourFilletFactory extends GeometryFactory implements CurveFilletFactory {
    controlPoints!: number[];
    readonly radiuses!: number[];

    private _contour!: visual.SpaceInstance<visual.Curve3D>;
    private _model!: c3d.Contour3D;

    get model() { return this._model }
    set model(model: c3d.Contour3D) {
        this._model = model;
        let fillNumber = model.GetSegmentsCount();
        fillNumber -= model.IsClosed() ? 0 : 1;
        (this.radiuses as ContourFilletFactory['radiuses']) = new Array<number>(fillNumber);
        this.radiuses.fill(0);
    }

    get contour() { return this._contour }
    set contour(contour: visual.SpaceInstance<visual.Curve3D>) {
        this._contour = contour;

        const inst = this.db.lookup(contour);
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
        this.model = model;
    }

    set radius(radius: number) {
        for (const p of this.controlPoints) {
            const index = (p === 0 && this.model.IsClosed()) ? this.model.GetSegmentsCount() - 1 : p - 1;
            this.radiuses[index] = radius;
        }
    }

    get cornerAngles() {
        const result = [];
        for (const i of this.controlPoints) {
            const contour = this.model;
            const info = contour.GetCornerAngle(i);
            result.push({
                origin: cart2vec(info.origin),
                tau: vec2vec(info.tau),
                axis: vec2vec(info.axis),
                angle: info.angle,
            })
        }
        return result;
    }

    get cornerAngle() { return averageCornerAngles(this.cornerAngles) }

    async computeGeometry() {
        const { model, radiuses, db } = this;

        const result = c3d.ActionSurfaceCurve.CreateContourFillets(model, radiuses, c3d.ConnectingType.Fillet);
        return new c3d.SpaceInstance(result);
    }

    get originalItem() { return this.contour }
}

export class JointFilletFactory extends GeometryFactory {
    private _joint!: Joint;

    private readonly factory = new ContourFilletFactory(this.db, this.materials, this.signals);

    get joint() { return this._joint }

    async setJoint(joint: Joint) {
        this._joint = joint;
        const contourFactory = new JoinCurvesFactory(this.db, this.materials, this.signals);
        contourFactory.push(joint.on1.curve);
        contourFactory.push(joint.on2.curve);
        const contours = await contourFactory.computeGeometry();
        const inst = contours[0];
        const item = inst.GetSpaceItem()!;
        const contour = item.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
        this.factory.model = contour;
        const index = joint.on1.isTmin ? this.factory.radiuses.length : 1;
        this.factory.controlPoints = [index];
    }

    get cornerAngle() { return this.factory.cornerAngle }
    async computeGeometry() { return this.factory.computeGeometry() }
    set radius(r: number) { this.factory.radius = r }
    get originalItem() { return [this.joint.on1.curve, this.joint.on2.curve] }

    // This is not strictly necessary but conceptually we should do this.
    resource(reg: CancellableRegistor): this {
        this.factory.resource(reg);
        return super.resource(reg);
    }
}

export class PolylineFilletFactory extends GeometryFactory implements CurveFilletFactory {
    private polyline!: visual.SpaceInstance<visual.Curve3D>;

    private readonly factory = new ContourFilletFactory(this.db, this.materials, this.signals);

    async setPolyline(polyline: visual.SpaceInstance<visual.Curve3D>) {
        const polyline2contour = new Polyline2ContourFactory(this.db, this.materials, this.signals);
        polyline2contour.polyline = polyline;
        const inst = await polyline2contour.computeGeometry() as c3d.SpaceInstance;
        const contour = inst.GetSpaceItem()!.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
        this.factory.model = contour;
        this.polyline = polyline;
    }

    get controlPoints() { return this.factory.controlPoints }
    set controlPoints(points: number[]) { this.factory.controlPoints = points }
    set radius(radius: number) { this.factory.radius = radius }
    get radiuses() { return this.factory.radiuses }
    get cornerAngles() { return this.factory.cornerAngles }
    get cornerAngle() { return this.factory.cornerAngle }

    async computeGeometry() {
        const { controlPoints } = this;
        if (controlPoints.length < 1) throw new Error("invalid precondition");
        if (controlPoints.length > this.factory.model.GetSegmentsCount() - 1) throw new Error("invalid precondition");

        return this.factory.computeGeometry();
    }

    // This is not strictly necessary but conceptually we should do this.
    resource(reg: CancellableRegistor): this {
        this.factory.resource(reg);
        return super.resource(reg);
    }

    get originalItem() { return this.polyline }
}

export class PolylineOrContourFilletFactory extends GeometryFactory implements CurveFilletFactory {
    private factory!: PolylineFilletFactory | ContourFilletFactory;

    private curve!: visual.SpaceInstance<visual.Curve3D>;

    async setCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        const { db } = this;
        const inst = db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        let factory;
        switch (item.IsA()) {
            case c3d.SpaceType.Polyline3D:
                factory = new PolylineFilletFactory(this.db, this.materials, this.signals);
                await factory.setPolyline(curve);
                break;
            case c3d.SpaceType.Contour3D:
                factory = new ContourFilletFactory(this.db, this.materials, this.signals);
                factory.model = item.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
                break;
            default: throw new Error("invalid precondition: " + c3d.SpaceType[item.Type()]);
        }
        this.factory = factory;
        this.curve = curve;
    }

    set controlPoints(controlPoints: number[]) {
        this.factory.controlPoints = controlPoints;
    }

    get cornerAngle() { return this.factory.cornerAngle }
    set radius(radius: number) { this.factory.radius = radius }
    async computeGeometry() { return this.factory.computeGeometry() }

    get originalItem() { return this.curve }
}

export class JointOrPolylineOrContourFilletFactory extends GeometryFactory {
    private factory: (PolylineOrContourFilletFactory | JointFilletFactory)[] = [];
    contours!: ContourManager;

    async setControlPoints(controlPoints: { index: number, parentItem: visual.SpaceInstance<visual.Curve3D> }[]) {
        const nonJoints = [];
        for (const cp of controlPoints) {
            const last = cp.parentItem.underlying.points.length - 1;
            const inst = this.db.lookup(cp.parentItem);
            const curve = inst.GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            if (!curve.IsClosed() && (cp.index === 0 || cp.index === last)) {
                const info = this.contours.lookup(cp.parentItem);
                const joint = cp.index === 0 ? info.joints.start : info.joints.stop;
                if (joint === undefined) throw new Error("invalid precondition");

                const fact = new JointFilletFactory(this.db, this.materials, this.signals);
                await fact.setJoint(joint);
                this.factory.push(fact);
            } else {
                nonJoints.push(cp);
            }
        }
        if (nonJoints.length > 0) {
            const pcfactory = new PolylineOrContourFilletFactory(this.db, this.materials, this.signals)
            await pcfactory.setCurve(nonJoints[0].parentItem);
            pcfactory.controlPoints = nonJoints.map(cp => cp.index);
            this.factory.push(pcfactory);
        }
    }

    set radius(radius: number) { for (const f of this.factory) f.radius = radius }

    get cornerAngle() {
        const corners = [];
        for (const f of this.factory) corners.push(f.cornerAngle);
        return averageCornerAngles(corners);
    }

    get originalItem() {
        const result = [];
        for (const f of this.factory) result.push(f.originalItem);
        return result.flat();
    }

    async computeGeometry() {
        const result = [];
        for (const f of this.factory) result.push(f.computeGeometry());
        return Promise.all(result);
    }
}

export class Polyline2ContourFactory extends GeometryFactory {
    polyline!: visual.SpaceInstance<visual.Curve3D>;

    async computeGeometry() {
        const { db, polyline } = this;
        const inst = db.lookup(polyline);
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);
        const points = model.GetPoints();
        if (points.length < 2) throw new Error("invalid precondition");
        let prev = points.shift()!;
        const start = prev;
        const segments = [];
        for (const curr of points) {
            const factory = new LineFactory(this.db, this.materials, this.signals);
            factory.p1 = cart2vec(prev);
            factory.p2 = cart2vec(curr);
            const segment = factory.computeGeometry();
            segments.push(segment);
            prev = curr;
        }
        if (model.IsClosed()) {
            const factory = new LineFactory(this.db, this.materials, this.signals);
            factory.p1 = cart2vec(prev);
            factory.p2 = cart2vec(start);
            const segment = factory.computeGeometry();
            segments.push(segment);
        }
        const finished = await Promise.all(segments);
        const makeContour = new JoinCurvesFactory(this.db, this.materials, this.signals);
        for (const segment of finished) makeContour.push(segment);
        const result = await makeContour.computeGeometry();
        return result[0];
    }

    get originalItem() { return this.polyline }
}

function averageCornerAngles(corners: CornerAngle[]): CornerAngle {
    const origin = new THREE.Vector3();
    const tau = new THREE.Vector3();
    const axis = new THREE.Vector3();
    let angle = 0;
    for (const corner of corners) {
        origin.add(corner.origin);
        tau.add(corner.tau);
        axis.add(corner.axis);
        angle += corner.angle;
    }
    origin.divideScalar(corners.length);
    tau.divideScalar(corners.length);
    axis.divideScalar(corners.length);
    angle /= corners.length;
    return {
        origin, tau, axis, angle
    }
}