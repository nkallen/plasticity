import { cart2vec } from '../../util/Conversion';
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../GeometryFactory';

export default class OffsetContourFactory extends GeometryFactory {
    curve!: c3d.Curve3D;
    face!: c3d.Face;
    direction!: c3d.Axis3D;
    distance = 0;

    private names = new c3d.SNameMaker(c3d.CreatorType.Curve3DCreator, c3d.ESides.SideNone, 0)

    async calculate() {
        const { curve, face, direction, distance, names } = this;

        const wireframe = c3d.ActionSurfaceCurve.OffsetCurve(curve, face, direction, distance, names);
        const curves = wireframe.GetCurves();

        // FIXME:  "(after the using call DeleteItem for arguments) "
        if (curves[0].IsPlanar()) {
            const { curve2d, placement } = curves[0].GetPlaneCurve(false);
            return new c3d.SpaceInstance(new c3d.PlaneCurve(placement, curve2d, false));
        } else {
            const { curve2d, surface } = curves[0].GetSurfaceCurve();
            const contour = new c3d.Contour([curve2d], false);
            const contourOnSurface = new c3d.ContourOnSurface(face.GetSurface(), contour, false);
            return new c3d.SpaceInstance(contourOnSurface);
        }


    }
}
