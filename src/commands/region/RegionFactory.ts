import { point2point, normalizePlacement } from '../../util/Conversion';
import { curve3d2curve2d } from '../../util/Conversion';
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../visual_model/VisualModel';
import { GeometryFactory } from '../GeometryFactory';

export class RegionFactory extends GeometryFactory {
    contours = new Array<visual.SpaceInstance<visual.Curve3D>>();

    async calculate() {
        const curves = [];
        let hint = new c3d.Placement3D();
        for (const contour of this.contours) {
            const inst = this.db.lookup(contour);
            const item = inst.GetSpaceItem()!;

            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const { curve: curve2d, placement } = curve3d2curve2d(curve, hint)!;
            hint = placement;
            normalizePlacement(curve2d, placement, new Set([hint]));
            curves.push(curve2d);
        }

        const { contours } = c3d.ContourGraph.OuterContoursBuilder(curves);
        const regions = c3d.ActionRegion.GetCorrectRegions(contours, false);
        return [...regions].map(r => new c3d.PlaneInstance(r, hint));
    }
}
