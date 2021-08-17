import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { GeometryFactory, ValidationError } from '../GeometryFactory';

export default class OffsetContourFactory extends GeometryFactory {
    model!: c3d.Contour;
    surface!: c3d.Surface;
    distance = 0;

    async computeGeometry() {
        const { model, distance, surface } = this;

        const offset = c3d.ActionCurve.OffsetContour(model, distance, surface.GetUEpsilon(), surface.GetVEpsilon(), false);
        // const mat = new c3d.Matrix();
        // mat.ScaleX(1.01);
        // model.Transform(mat)

        // if (offset === null) throw new ValidationError("invalid curve");

        // const plane = new c3d.Plane(placement, 0);

        const contourOnSurface = new c3d.ContourOnSurface(surface, offset!, false);

        return new c3d.SpaceInstance(contourOnSurface);
    }
}