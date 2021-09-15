import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { curve3d2curve2d, unit } from '../../util/Conversion';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export interface MultilineParams {

}

export default class MultilineFactory extends GeometryFactory implements MultilineParams {
    private _curve!: visual.SpaceInstance<visual.Curve3D>;
    private model!: c3d.Contour;
    private placement!: c3d.Placement3D;

    set curve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this._curve = curve;
        const inst = this.db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D())!;
        this.model = new c3d.Contour([curve2d], false);
        this.placement = placement;
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.Curve3DCreator, c3d.ESides.SideNone, 0);

    async calculate() {
        const { model, placement } = this;

        const vertInfo = new c3d.VertexOfMultilineInfo();
        const tip = new c3d.MLTipParams(2, 10);
        const multiline = new c3d.Multiline(model, vertInfo, [-10, 10], tip, tip, true, false);

        const begTipCurve = multiline.GetBegTipCurve()!;
        const endTipCurve = multiline.GetEndTipCurve()!;
        const contour1 = multiline.GetCurve(0)!;
        const contour2 = multiline.GetCurve(multiline.GetCurvesCount() - 1)!;
        const outContour = new c3d.Contour([], false);
        outContour.AddCurveWithRuledCheck(begTipCurve, 1e-6);
        outContour.AddCurveWithRuledCheck(contour1, 1e-6);
        outContour.AddCurveWithRuledCheck(endTipCurve, 1e-6);
        outContour.AddCurveWithRuledCheck(contour2, 1e-6);

        return new c3d.SpaceInstance(new c3d.PlaneCurve(placement, outContour, false));
    }

    get originalItem() {
        return this._curve;
    }
}