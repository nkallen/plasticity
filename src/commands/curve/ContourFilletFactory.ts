import { cart2vec, vec2vec } from '../../util/Conversion';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { Joint } from '../ContourManager';
import { GeometryFactory } from '../Factory';
import JoinCurvesFactory from './JoinCurvesFactory';
import { CancellableRegistor } from 'src/util/Cancellable';

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
        contourFactory.curves.push(joint.on1.curve);
        contourFactory.curves.push(joint.on2.curve);
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