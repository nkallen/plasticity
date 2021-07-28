import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { CancellableRegistor } from '../../util/Cancellable';
import { cart2vec, vec2vec } from '../../util/Conversion';
import { Joint } from '../ContourManager';
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
    radiuses!: number[];

    private _contour!: visual.SpaceInstance<visual.Curve3D>;
    model!: c3d.Contour3D;

    get contour() { return this._contour }
    set contour(contour: visual.SpaceInstance<visual.Curve3D>) {
        this._contour = contour;

        const inst = this.db.lookup(contour);
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
        let fillNumber = model.GetSegmentsCount();
        fillNumber -= model.IsClosed() ? 0 : 1;
        this.radiuses = new Array<number>(fillNumber);
        this.radiuses.fill(0);
        this.model = model;
    }

    set radius(radius: number) {
        for (const p of this.controlPoints) {
            this.radiuses[p - 1] = radius;
        }
    }

    get cornerAngle() {
        const contour = this.model;
        const info = contour.GetCornerAngle(1);
        return {
            origin: cart2vec(info.origin),
            tau: vec2vec(info.tau),
            axis: vec2vec(info.axis),
            angle: info.angle,
        }
    }

    async computeGeometry() {
        const { model, radiuses, db } = this;

        const result = c3d.ActionSurfaceCurve.CreateContourFillets(model, radiuses, c3d.ConnectingType.Fillet);
        return new c3d.SpaceInstance(result);
    }

    get originalItem() { return this.contour }
}

export class JointFilletFactory extends GeometryFactory {
    radiuses!: number[];
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
        this.factory.radiuses = [0];
    }

    get cornerAngle() {
        return this.factory.cornerAngle;
    }

    async computeGeometry() {
        return this.factory.computeGeometry();
    }

    set radius(r: number) {
        this.factory.radiuses[0] = r;
    }

    get originalItem() { return [this.joint.on1.curve, this.joint.on2.curve] }

    // This is not strictly necessary but conceptually we should do this.
    resource(reg: CancellableRegistor): this {
        this.factory.resource(reg);
        return super.resource(reg);
    }
}

export class PolylineFilletFactory extends GeometryFactory implements CurveFilletFactory {
    controlPoints!: number[];
    radiuses!: number[];

    private polyline!: visual.SpaceInstance<visual.Curve3D>;

    private readonly factory = new ContourFilletFactory(this.db, this.materials, this.signals);

    async setPolyline(polyline: visual.SpaceInstance<visual.Curve3D>) {
        const polyline2contour = new Polyline2ContourFactory(this.db, this.materials, this.signals);
        polyline2contour.polyline = polyline;
        const inst = await polyline2contour.computeGeometry() as c3d.SpaceInstance;
        const contour = inst.GetSpaceItem()!.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
        this.factory.model = contour;
        this.polyline = polyline;

        this.radiuses = new Array<number>(contour.GetSegmentsCount() - 1);
        this.radiuses.fill(0);
    }

    set radius(radius: number) {
        for (const p of this.controlPoints) {
            this.radiuses[p - 1] = radius;
        }
    }

    get cornerAngles() {
        const result = [];
        for (const i of this.controlPoints) {
            const contour = this.factory.model;
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

    get cornerAngle() {
        const corners = this.cornerAngles;
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

    async computeGeometry() {
        const { controlPoints, radiuses } = this;
        if (controlPoints.length < 1) throw new Error("invalid precondition");
        if (controlPoints.length > this.factory.model.GetSegmentsCount() - 1) throw new Error("invalid precondition");

        this.factory.radiuses = radiuses;

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

    get cornerAngle() {
        return this.factory.cornerAngle;
    }

    set radius(radius: number) {
        this.factory.radius = radius;
    }

    async computeGeometry() {
        return this.factory.computeGeometry();
    }

    get originalItem() { return this.curve }
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