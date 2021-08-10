import { ContourAndPlacement, curve3d2curve2d } from '../../util/Conversion';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export default class LoftFactory extends GeometryFactory {
    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    private models!: { contour: c3d.Contour, placement: c3d.Placement3D }[];
    spine?: visual.SpaceInstance<visual.Curve3D>;

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.CurveLoftedSolid, c3d.ESides.SideNone, 0);

    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        this._curves = curves;
        const models = [];

        for (const curve of curves) {
            const instance = this.db.lookup(curve);
            const item = instance.GetSpaceItem()!;
            const curve3d = item.Cast<c3d.Curve3D>(item.IsA());
            const planar = curve3d2curve2d(curve3d, new c3d.Placement3D());
            if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
            const contour = new c3d.Contour([planar.curve], true);
            models.push({ contour, placement: planar.placement });
        }
        this.models = models;
    }


    protected async computeGeometry() {
        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];
        const params = new c3d.LoftedValues();
        const placements = this.models.map(m => m.placement);
        const contours = this.models.map(m => m.contour);
        const solid = c3d.ActionSolid.LoftedSolid(placements, contours, null, params, [], this.names, ns);
        return solid;
    }
}