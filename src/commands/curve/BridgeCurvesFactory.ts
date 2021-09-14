import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export default class BridgeCurvesFactory extends GeometryFactory {
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

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.Curve3DCreator, c3d.ESides.SideNone, 0);

    async calculate() {
        const { model1: curve1, model2: curve2, names } = this;

        const { result, surface } = c3d.ActionSurfaceCurve.FilletCurve(curve1, 0, 0, curve2, 0, 0, 0, true, true, c3d.ConnectingType.Bridge, names);
        const curves = result.GetCurves();
        if (curves.length !== 1) throw new ValidationError();

        return curves.map(curve => new c3d.SpaceInstance(curve));
    }
}