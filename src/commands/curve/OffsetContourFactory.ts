import * as visual from '../../editor/VisualModel';
import { point2point, unit, vec2vec } from '../../util/Conversion';
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../GeometryFactory';

export default class OffsetContourFactory extends GeometryFactory {
    distance = 0;
    
    center!: THREE.Vector3;
    normal!: THREE.Vector3;
    
    private curve!: c3d.Curve3D;
    private model!: c3d.Face;
    private direction!: c3d.Axis3D;
    set face(face: visual.Face) {
        const model = this.db.lookupTopologyItem(face).DataDuplicate()!;
        const contour = new c3d.Contour3D();
        for (let i = 0, l = model.GetLoopsCount(); i < l; i++) {
            const loop = model.GetLoop(i)!;
            for (let j = 0, ll = loop.GetEdgesCount(); j < ll; j++) {
                const edge = loop.GetOrientedEdge(j)!.GetCurveEdge();
                if (edge.IsSeam() || edge.IsPole()) continue;
                contour.AddCurveWithRuledCheck(edge.GetIntersectionCurve());
            }
        }

        const tau = contour.Tangent(contour.GetTMin());
        const cp = contour.GetLimitPoint(1);
        const { normal } = model.NearPointProjection(cp);
        const n_cross_tau = vec2vec(normal, 1).cross(vec2vec(tau, 1)).normalize();

        const fsurface = model.GetSurface();
        const u = fsurface.GetUMid(), v = fsurface.GetVMid();
        const p = fsurface.PointOn(new c3d.CartPoint(u, v));
        const n = fsurface.Normal(u, v);

        this.center = point2point(p);
        this.normal = vec2vec(n, 1);

        this.direction = new c3d.Axis3D(cp, vec2vec(n_cross_tau, 1));
        this.model = model;
        this.curve = contour;
    }

    private names = new c3d.SNameMaker(c3d.CreatorType.Curve3DCreator, c3d.ESides.SideNone, 0)

    async calculate() {
        const { curve, model, direction, distance, names } = this;

        const params = new c3d.SurfaceOffsetCurveParams(model, direction, unit(distance), names);
        const wireframe = await c3d.ActionSurfaceCurve.OffsetCurve_async(curve, params);
        const curves = wireframe.GetCurves();

        return new c3d.SpaceInstance(curves[0]);
    }
}
