import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { CancellableRegistor } from '../../util/Cancellable';
import { cart2vec, vec2vec } from '../../util/Conversion';
import { Joint } from '../ContourManager';
import { GeometryFactory } from '../Factory';
import LineFactory from '../line/LineFactory';
import JoinCurvesFactory from './JoinCurvesFactory';

export class ContourFilletFactory extends GeometryFactory {
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
        this.model = model;
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
        const contour = this.factory.model;
        const info = contour.GetCornerAngle(1);
        return {
            origin: cart2vec(info.origin),
            tau: vec2vec(info.tau),
            axis: vec2vec(info.axis),
            angle: info.angle,
        }
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

export class PolylineFilletFactory extends GeometryFactory {
    polyline!: visual.SpaceInstance<visual.Curve3D>;
    controlPoints!: number[];
    radiuses!: number[];

    async setPolyline(polyline: visual.SpaceInstance<visual.Curve3D>) {
        const contourFactory = new JoinCurvesFactory(this.db, this.materials, this.signals);
        contourFactory.push(polyline);
        const contours = await contourFactory.computeGeometry();
        const inst = contours[0];
        const item = inst.GetSpaceItem()!;
        const contour = item.Cast<c3d.Contour3D>(c3d.SpaceType.Contour3D);
        console.log(contour.GetSegmentsCount());
    }

    async computeGeometry() {
        // return this.factory.computeGeometry();
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