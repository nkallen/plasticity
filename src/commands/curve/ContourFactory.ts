import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

export default class ContourFactory extends GeometryFactory {
    readonly curves = new Array<visual.SpaceInstance<visual.Curve3D>>();

    async calculate() {
        const { curves } = this;

        if (this.curves.length === 0) throw new Error("not enough curves");

        const spaceItem = this.db.lookup(this.curves[0]).GetSpaceItem()!;
        const firstCurve = spaceItem.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const contour = c3d.ActionCurve3D.CreateContour(firstCurve);
        for (const curve of curves.slice(1)) {
            const spaceItem = this.db.lookup(curve).GetSpaceItem();
            if (spaceItem === null) throw new Error("invalid precondition");
            const nextCurve = spaceItem.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            contour.AddCurveWithRuledCheck(nextCurve);
        }
        return new c3d.SpaceInstance(contour);
    }
}