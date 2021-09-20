import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { point2point, unit, vec2vec } from '../../util/Conversion';
import { GeometryFactory } from '../GeometryFactory';

export default class RevolutionFactory extends GeometryFactory {
    origin!: THREE.Vector3;
    axis!: THREE.Vector3;

    thickness1 = 0;
    thickness2 = 0;
    set thickness(thickness: number) {
        this.thickness1 = this.thickness2 = thickness;
    }

    side1 = Math.PI;
    side2 = 0;

    protected surface!: c3d.Surface;
    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    protected contours2d!: c3d.Contour[];
    protected curves3d!: c3d.Curve3D[];
    get curves() { return this._curves }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        this._curves = curves;
        const contours2d: c3d.Contour[] = [];
        const curves3d: c3d.Curve3D[] = [];
        for (const curve of curves) {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;

            if (item.IsA() === c3d.SpaceType.ContourOnSurface || item.IsA() === c3d.SpaceType.ContourOnPlane) {
                const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
                contours2d.push(model.GetContour());
            } else if (item.IsA() === c3d.SpaceType.Contour3D) {
                const model = item.Cast<c3d.Contour3D>(item.IsA());
                curves3d.push(model);
            } else {
                const model = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
                if (model.IsPlanar()) {
                    const { curve2d } = model.GetPlaneCurve(false);
                    contours2d.push(new c3d.Contour([curve2d], true));
                } else {
                    curves3d.push(model);
                }
            }
        }
        this.contours2d = contours2d;
        this.curves3d = curves3d;

        const inst = this.db.lookup(curves[0]);
        const item = inst.GetSpaceItem()!;

        let placement;
        if (item.IsA() === c3d.SpaceType.ContourOnPlane) {
            const model = item.Cast<c3d.ContourOnPlane>(item.IsA());
            this.surface = model.GetSurface();
            placement = model.GetPlacement();
        } else if (item.IsA() === c3d.SpaceType.ContourOnSurface) {
            const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
            this.surface = model.GetSurface();
            placement = new c3d.Placement3D();
        } else {
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            if (curve.IsPlanar()) {
                placement = curve.GetPlaneCurve(false).placement;
                this.surface = new c3d.Plane(placement, 0);
            } else {
                placement = new c3d.Placement3D();
            }
        }
    }

    private readonly names = new c3d.SNameMaker(c3d.CreatorType.CurveRevolutionSolid, c3d.ESides.SideNone, 0);

    async calculate() {
        const { origin, axis: direction, contours2d, curves3d, names, thickness1, thickness2, surface, side1: scalarValue1, side2: scalarValue2 } = this;

        const sweptData = contours2d.length > 0
            ? new c3d.SweptData(surface, contours2d)
            : new c3d.SweptData(curves3d[0]);

        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];

        const axis = new c3d.Axis3D(point2point(origin), vec2vec(direction, 1));
        const params = new c3d.RevolutionValues();
        params.shellClosed = true;
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);

        const { side1, side2 } = params;
        side1.way = c3d.SweptWay.scalarValue;
        side1.scalarValue = scalarValue1;

        side2.way = c3d.SweptWay.scalarValue;
        side2.scalarValue = scalarValue2;
        params.side1 = side1;
        params.side2 = side2;

        const result = c3d.ActionSolid.RevolutionSolid(sweptData, axis, params, names, ns);
        return result;
    }
}