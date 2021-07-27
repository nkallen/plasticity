import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory } from '../Factory';

export default class JoinCurvesFactory extends GeometryFactory {
    readonly curves = new Array<visual.SpaceInstance<visual.Curve3D>>();

    async computeGeometry() {
        if (this.curves.length === 0) throw new Error("not enough curves");

        const curves = [];
        for (const curve of this.curves) {
            const spaceItem = this.db.lookup(curve).GetSpaceItem()!;
            curves.push(spaceItem.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D));
        }
        const contours = c3d.ActionCurve3D.CreateContours(curves, 10);
        const result = [];
        for (const contour of contours) {
            result.push(new c3d.SpaceInstance(contour));
        }
        return result;
    }

    get originalItem() { return this.curves }
}