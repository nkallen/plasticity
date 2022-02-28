import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory } from '../../command/GeometryFactory';
import { composeMainName, normalizePlacement, point2point } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';
import { SweptParams } from "./RevolutionFactory";

export abstract class SweepFactory extends GeometryFactory implements SweptParams {
    thickness1 = 0;
    thickness2 = 0;
    set thickness(thickness: number) {
        this.thickness1 = this.thickness2 = Math.max(0, thickness);
    }
    protected readonly names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.CurveRevolutionSolid, this.db.version), c3d.ESides.SideNone, 0);

    protected surface!: c3d.Surface;
    protected contours2d: c3d.Contour[] = [];
    protected curves3d: c3d.Curve3D[] = [];
    protected _center!: THREE.Vector3;

    protected _placement!: c3d.Placement3D;
    get placement() { return this._placement; }

    private _curves!: visual.SpaceInstance<visual.Curve3D>[];
    get curves() { return this._curves; }
    set curves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        if (curves.length === 0)
            return;

        this._curves = curves;
        const contours2d: c3d.Contour[] = [];
        const curves3d: c3d.Curve3D[] = [];
        const placements = new Set<c3d.Placement3D>();

        const bbox = new THREE.Box3();
        for (const curve of curves) {
            bbox.expandByObject(curve);
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
        this._center = bbox.getCenter(new THREE.Vector3());
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
        this._placement = placement;
    }

    set region(region: visual.PlaneInstance<visual.Region>) {
        this.regions = [region];
    }

    private _regions!: visual.PlaneInstance<visual.Region>[];
    get regions() { return this._regions; }
    set regions(regions: visual.PlaneInstance<visual.Region>[]) {
        if (regions.length === 0)
            return;

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
        if (placements.size > 1)
            throw new Error("All regions must be on same placement");
        this.contours2d = contours;
        this.surface = new c3d.Plane([...placements][0], 0);

        const bbox = new THREE.Box3();
        for (const region of regions)
            bbox.setFromObject(region);
        this._center = bbox.getCenter(new THREE.Vector3());
    }

    private _face!: visual.Face;
    get face() { return this._face; }
    set face(face: visual.Face) {
        this._face = face;
        const model = this.db.lookupTopologyItem(face);

        const { surface, contours } = model.GetSurfaceCurvesData();
        this.contours2d = contours;
        this.surface = surface;

        const fsurface = model.GetSurface();

        const u = fsurface.GetUMid(), v = fsurface.GetVMid();
        const p = fsurface.PointOn(new c3d.CartPoint(u, v));
        this._center = point2point(p);
    }

    get center(): THREE.Vector3 { return this._center; }
}
