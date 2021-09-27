import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { unit } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export interface BridgeCurvesParams {
    t1: number;
    t2: number;
    radius: number;
    sense: boolean;
    type: c3d.ConnectingType;
}

export default class BridgeCurvesFactory extends GeometryFactory implements BridgeCurvesParams {
    private _curve1!: visual.SpaceInstance<visual.Curve3D>;
    private _curve2!: visual.SpaceInstance<visual.Curve3D>;

    private model1!: c3d.Curve3D;
    private model2!: c3d.Curve3D;

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
    radius = 0;
    sense = true;
    type = c3d.ConnectingType.Bridge;

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.Curve3DCreator, c3d.ESides.SideNone, 0);

    async calculate() {
        const { model1: curve1, model2: curve2, names, t1, t2, radius, sense, type } = this;

        const { result } = c3d.ActionSurfaceCurve.FilletCurve(curve1, t1, curve2, t2, unit(radius), sense, type, names);
        const curves = result.GetCurves();
        if (curves.length !== 1) throw new ValidationError();

        return curves.map(curve => new c3d.SpaceInstance(curve));
    }
}