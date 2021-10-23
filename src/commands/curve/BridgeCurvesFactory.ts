import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { composeMainName } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export interface BridgeCurvesParams {
    t1: number;
    t2: number;
    sense1: boolean;
    sense2: boolean;
    tension1: number;
    tension2: number;
    type: c3d.ConnectingType;
    mating1: c3d.MatingType
    mating2: c3d.MatingType
}

abstract class AbstractBridgeCurvesFactory extends GeometryFactory {
    protected _curve1!: visual.SpaceInstance<visual.Curve3D>;
    protected _curve2!: visual.SpaceInstance<visual.Curve3D>;

    protected model1!: c3d.Curve3D;
    protected model2!: c3d.Curve3D;

    set curve1(curve: visual.SpaceInstance<visual.Curve3D>) {
        this._curve1 = curve;
        const inst = this.db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        this.model1 = item.Cast<c3d.Curve3D>(item.IsA());
    }

    set curve2(curve: visual.SpaceInstance<visual.Curve3D>) {
        this._curve2 = curve;
        const inst = this.db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        this.model2 = item.Cast<c3d.Curve3D>(item.IsA());
    }

    t1 = 0;
    t2 = 0;

    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.Curve3DCreator, this.db.version), c3d.ESides.SideNone, 0);
}

export class BridgeCurvesFactory extends AbstractBridgeCurvesFactory {
    sense1 = false;
    sense2 = false;

    async calculate() {
        const { model1: curve1, model2: curve2, names, t1, t2, sense1, sense2 } = this;

        const result = c3d.ActionSurfaceCurve.BridgeCurve(curve1, t1, sense1, curve2, t2, sense2, names);
        const curves = result.GetCurves();
        if (curves.length !== 1) throw new ValidationError();

        return new c3d.SpaceInstance(curves[0]);
    }
}

export class ConnectingSplineFactory extends AbstractBridgeCurvesFactory {
    mating1: c3d.MatingType = c3d.MatingType.Tangent;
    mating2: c3d.MatingType = c3d.MatingType.Tangent;
    tension1 = 0;
    tension2 = 0;

    async calculate() {
        const { model1: curve1, model2: curve2, names, t1, t2, mating1, mating2, tension1, tension2 } = this;

        const result = c3d.ActionSurfaceCurve.ConnectingSpline(curve1, t1, mating1, curve2, t2, mating2, tension1, tension2, names)
        const curves = result.GetCurves();
        if (curves.length !== 1) throw new ValidationError();

        return new c3d.SpaceInstance(curves[0]);
    }
}

export default class BridgeOrSplineFactory extends GeometryFactory implements BridgeCurvesParams {
    private bridge = new BridgeCurvesFactory(this.db, this.materials, this.signals);
    private spline = new ConnectingSplineFactory(this.db, this.materials, this.signals);

    get curve1() { return this.bridge.curve1 }
    set curve1(curve1:  visual.SpaceInstance<visual.Curve3D>) { this.bridge.curve1 = curve1; this.spline.curve1 = curve1 }

    get curve2() { return this.bridge.curve2 }
    set curve2(curve2:  visual.SpaceInstance<visual.Curve3D>) { this.bridge.curve2 = curve2; this.spline.curve2 = curve2 }

    get t1() { return this.bridge.t1 }
    set t1(t1: number) { this.bridge.t1 = t1; this.spline.t1 = t1 }

    get t2() { return this.bridge.t2 }
    set t2(t2: number) { this.bridge.t2 = t2; this.spline.t2 = t2 }

    get sense1() { return this.bridge.sense1 }
    set sense1(sense1: boolean) { this.bridge.sense1 = sense1 }

    get sense2() { return this.bridge.sense2 }
    set sense2(sense2: boolean) { this.bridge.sense2 = sense2 }

    get tension1() { return this.spline.tension1 }
    set tension1(tension1: number) { this.spline.tension1 = tension1 }

    get tension2() { return this.spline.tension2 }
    set tension2(tension2: number) { this.spline.tension2 = tension2 }

    get mating1() { return this.spline.mating1 }
    set mating1(mating1: c3d.MatingType) { this.spline.mating1 = mating1 }

    get mating2() { return this.spline.mating2 }
    set mating2(mating2: c3d.MatingType) { this.spline.mating2 = mating2 }

    type = c3d.ConnectingType.Spline;

    async calculate() {
        switch (this.type) {
            case c3d.ConnectingType.Bridge:
                return this.bridge.calculate();
            case c3d.ConnectingType.Spline:
                return this.spline.calculate();
            default: throw new Error("invalid precondition");
        }
    }
}