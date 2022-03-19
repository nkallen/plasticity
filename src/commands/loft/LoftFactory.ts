import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory, ValidationError } from '../../command/GeometryFactory';
import { composeMainName, curve3d2curve2d, inst2curve, point2point, unit, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';

export interface LoftParams {
    thickness1: number;
    thickness2: number;
    thickness: number;
    closed: boolean;
}

export default class LoftFactory extends GeometryFactory implements LoftParams {
    private models!: { contour: c3d.Contour, placement: c3d.Placement3D }[];
    thickness1 = 0;
    thickness2 = 0;
    closed = false;

    protected _spine: { view?: visual.SpaceInstance<visual.Curve3D>, model?: c3d.Curve3D } = {};
    get spine(): visual.SpaceInstance<visual.Curve3D> { return this._spine.view! }
    set spine(spine: visual.SpaceInstance<visual.Curve3D> | c3d.Curve3D) { 
        if (spine instanceof c3d.Curve3D) this._spine = { model: spine };
         else {
            this._spine = { view: spine, model: inst2curve(this.db.lookup(spine)) };
        }
        if (this._spine.model!.IsClosed()) this.closed = true;
    }

    get thickness() { return this.thickness1 }
    set thickness(thickness: number) {
        this.thickness1 = this.thickness2 = thickness;
    }
    
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        const models = [];

        for (const curve of curves) {
            const instance = this.db.lookup(curve);
            const curve3d = inst2curve(instance)!;
            const planar = curve3d2curve2d(curve3d, new c3d.Placement3D());
            if (planar === undefined) throw new ValidationError("Curve cannot be converted to planar");
            const contour = new c3d.Contour([planar.curve], true);
            models.push({ contour, placement: planar.placement });
        }
        this.models = models;
    }

    get info(): { point: THREE.Vector3, Z: THREE.Vector3 }[] {
        const points = [];
        for (const { contour, placement } of this.models) {
            const center = contour.GetWeightCentre();
            const point = placement.GetPointFrom(center.x, center.y, 0, c3d.LocalSystemType3D.CartesianSystem);
            points.push({ point: point2point(point), Z: vec2vec(placement.GetAxisZ(), 1) });
        }
        return points;
    }

    private readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveLoftedSolid, this.db.version), c3d.ESides.SideNone, 0);

    async calculate() {
        const { thickness1, thickness2, models, names, _spine: { model: spine }, closed } = this;

        const ns = [];
        for (const { contour } of models) {
            const maker = new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0);
            ns.push(maker);
        }
        const params = new c3d.LoftedValues();
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);
        params.shellClosed = true;
        params.closed = closed;
        const placements = models.map(m => m.placement);
        const contours = models.map(m => m.contour);
        const solid = c3d.ActionSolid.LoftedSolid(placements, contours, spine ?? null, params, [], names, ns);
        return solid;
    }
}