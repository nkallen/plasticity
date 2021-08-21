import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

export default class JoinCurvesFactory extends GeometryFactory {
    private curves = new Array<visual.SpaceInstance<visual.Curve3D>>();
    private models = new Array<c3d.Curve3D>();

    push(curve: visual.SpaceInstance<visual.Curve3D> | c3d.SpaceInstance) {
        if (curve instanceof visual.SpaceInstance) {
            this.curves.push(curve);
            const spaceItem = this.db.lookup(curve).GetSpaceItem()!;
            this.models.push(spaceItem.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D));
        } else {
            this.models.push(curve.GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D));
        }
    }

    async calculate() {
        const { models } = this;
        if (models.length < 2) throw new Error("not enough curves");

        const contours = c3d.ActionCurve3D.CreateContours(models, 10);
        const result = [];
        for (const contour of contours) {
            result.push(new c3d.SpaceInstance(contour));
        }
        return result;
    }

    get originalItem() { return this.curves }
}