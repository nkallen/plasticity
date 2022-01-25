import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../../command/GeometryFactory';
import { composeMainName, normalizePlacement, point2point, unit, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';

export interface RevolutionParams {
    origin: THREE.Vector3;
    axis: THREE.Vector3;

    thickness: number;
    thickness1: number;
    thickness2: number;
    side1: number;
    side2: number;

    shape: Shape;
}

export enum Shape { Torus = 0, Sphere = 1 }

class AbstractRevolutionFactory extends GeometryFactory implements RevolutionParams {
    origin!: THREE.Vector3;
    axis!: THREE.Vector3;

    thickness1 = 0;
    thickness2 = 0;
    set thickness(thickness: number) {
        this.thickness1 = this.thickness2 = Math.max(0, thickness);
    }

    side1 = 2 * Math.PI;
    side2 = 0;
    shape = Shape.Torus;

    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveRevolutionSolid, this.db.version), c3d.ESides.SideNone, 0);

    protected surface!: c3d.Surface;
    protected contours2d: c3d.Contour[] = [];
    protected curves3d: c3d.Curve3D[] = [];

    async calculate() {
        const { origin, axis: direction, contours2d, curves3d, names, thickness1, thickness2, surface, side1: scalarValue1, side2: scalarValue2, shape } = this;

        const sweptData = contours2d.length > 0
            ? new c3d.SweptData(surface, contours2d)
            : new c3d.SweptData(curves3d[0]);

        const ns = [new c3d.SNameMaker(0, c3d.ESides.SidePlus, 0)];

        const axis = new c3d.Axis3D(point2point(origin), vec2vec(direction, 1));
        const params = new c3d.RevolutionValues();
        params.shellClosed = true;
        params.thickness1 = unit(thickness1);
        params.thickness2 = unit(thickness2);
        params.shape = shape;

        const { side1, side2 } = params;
        side1.way = c3d.SweptWay.scalarValue;
        side1.scalarValue = scalarValue1;

        side2.way = c3d.SweptWay.scalarValue;
        side2.scalarValue = scalarValue2;
        params.side1 = side1;
        params.side2 = side2;

        return c3d.ActionSolid.RevolutionSolid_async(sweptData, axis, params, names, ns);
    }
}

export default class RevolutionFactory extends AbstractRevolutionFactory {
    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    get curves() { return this._curves }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        if (curves.length === 0) return;

        this._curves = curves;
        const contours2d: c3d.Contour[] = [];
        const curves3d: c3d.Curve3D[] = [];
        const placements = new Set<c3d.Placement3D>();

        for (const curve of curves) {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;

            if (item.IsA() === c3d.SpaceType.ContourOnSurface || item.IsA() === c3d.SpaceType.ContourOnPlane) {
                const model = item.Cast<c3d.ContourOnSurface>(item.IsA());
                contours2d.push(model.GetContour());
            } else if (item.IsA() === c3d.SpaceType.Contour3D) {
                const model = item.Cast<c3d.Contour3D>(item.IsA());
                if (model.IsPlanar()) {
                    const { curve2d, placement } = model.GetPlaneCurve(false);
                    normalizePlacement(curve2d, placement, placements);
                    contours2d.push(new c3d.Contour([curve2d], true));
                } else {
                    curves3d.push(model);
                }
            } else {
                const model = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
                if (model.IsPlanar()) {
                    const { curve2d, placement } = model.GetPlaneCurve(false);
                    normalizePlacement(curve2d, placement, placements);
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

    private _regions!: visual.PlaneInstance<visual.Region>[];
    get regions() { return this._regions }
    set regions(regions: visual.PlaneInstance<visual.Region>[]) {
        if (regions.length === 0) return;

        this._regions = regions;
        const contours = [];
        const placements = new Set<c3d.Placement3D>();
        for (const region of regions) {
            const inst = this.db.lookup(region);
            const item = inst.GetPlaneItem()!;
            const model = item.Cast<c3d.Region>(c3d.PlaneType.Region);
            const placement = inst.GetPlacement();
            for (let i = 0, l = model.GetContoursCount(); i < l; i++) {
                const contour = model.GetContour(i)!;
                normalizePlacement(contour, placement, placements);
                contours.push(contour);
            }
        }
        if (placements.size > 1) throw new Error("All regions must be on same placement");
        this.contours2d = contours;
        this.surface = new c3d.Plane([...placements][0], 0);
    }
}
