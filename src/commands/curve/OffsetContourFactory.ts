import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { GeometryFactory, ValidationError } from '../../command/GeometryFactory';
import { ConstructionPlane, ConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";
import { composeMainName, point2point, unit, vec2vec } from '../../util/Conversion';
import * as visual from '../../visual_model/VisualModel';

export interface OffsetCurveParams {
    distance: number;
}

export default class OffsetCurveFactory extends GeometryFactory {
    private readonly offsetFace = new OffsetFaceFactory(this.db, this.materials, this.signals);
    private readonly offsetCurve = new OffsetSpaceCurveFactory(this.db, this.materials, this.signals);

    set constructionPlane(constructionPlane: ConstructionPlane | undefined) {
        if (constructionPlane === undefined) return;
        this.offsetCurve.constructionPlane = constructionPlane
    }

    set distance(d: number) {
        this.offsetFace.distance = d;
        this.offsetCurve.distance = d;
    }

    set face(f: visual.Face) { this.offsetFace.face = f }
    set curve(c: visual.SpaceInstance<visual.Curve3D>) { this.offsetCurve.curve = c }
    set edges(edges: visual.CurveEdge[]) { this.offsetCurve.edges = edges }

    get center() {
        const { offsetCurve, offsetFace } = this;
        if (offsetCurve.hasCurve) return offsetCurve.center;
        if (offsetFace.hasCurve) return offsetFace.center;
        throw new ValidationError("no face or curve");
    }

    get normal() {
        const { offsetCurve, offsetFace } = this;
        if (offsetCurve.hasCurve) return offsetCurve.normal;
        if (offsetFace.hasCurve) return offsetFace.normal;
        throw new ValidationError("no face or curve");
    }

    async calculate() {
        const { offsetCurve, offsetFace } = this;
        if (offsetCurve.hasCurve) return offsetCurve.calculate();
        if (offsetFace.hasCurve) return offsetFace.calculate();
        throw new ValidationError("no face or curve");
    }
}

export class OffsetFaceFactory extends GeometryFactory {
    distance = 0;

    _center!: THREE.Vector3;
    get center() { return this._center }

    _normal!: THREE.Vector3;
    get normal() { return this._normal }

    get hasCurve() { return this.model !== undefined }

    curve!: c3d.Curve3D;
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
            break;
        }

        const tau = contour.Tangent(contour.GetTMin());
        const cp = contour.GetLimitPoint(1);
        const { normal } = model.NearPointProjection(cp);
        const n_cross_tau = vec2vec(normal, 1).cross(vec2vec(tau, 1)).normalize();

        const fsurface = model.GetSurface();
        const u = fsurface.GetUMid(), v = fsurface.GetVMid();
        const p = fsurface.PointOn(new c3d.CartPoint(u, v));
        const n = fsurface.Normal(u, v);

        this._center = point2point(p);
        this._normal = vec2vec(n, 1);

        this.direction = new c3d.Axis3D(cp, vec2vec(n_cross_tau, 1));
        this.model = model;
        this.curve = contour;
    }

    private names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.Curve3DCreator, this.db.version), c3d.ESides.SideNone, 0)

    async calculate() {
        const { curve, model, direction, distance, names } = this;

        if (curve.IsPlanar()) {
            // NOTE: this algorithm performs better in the planar case:
            const result = await c3d.ActionSurfaceCurve.OffsetPlaneCurve_async(curve, -unit(distance));
            repairUnclosedContour(result);
            return new c3d.SpaceInstance(result);
        } else {
            const params = new c3d.SurfaceOffsetCurveParams(model, direction, unit(distance), names);
            const wireframe = await c3d.ActionSurfaceCurve.OffsetSurfaceCurve_async(curve, params);
            const curves = wireframe.GetCurves();

            return new c3d.SpaceInstance(curves[0]);
        }
    }
}

export class OffsetSpaceCurveFactory extends GeometryFactory {
    constructionPlane: ConstructionPlane = new ConstructionPlaneSnap();
    distance = 0;

    private _center!: THREE.Vector3;
    get center() { return this._center }

    private _normal!: THREE.Vector3;
    get normal() { return this._normal }

    get hasCurve() { return this.model !== undefined }

    private model!: c3d.Curve3D;
    private _curve!: visual.SpaceInstance<visual.Curve3D>;
    get curve() { return this._curve }
    set curve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this._curve = curve;
        const inst = this.db.lookup(curve);
        const item = inst.GetSpaceItem()!;
        const model = item.Cast<c3d.Curve3D>(item.IsA());
        this.model = model;

        const { center, normal } = this.getCenterAndNormal(model);
        this._center = center;
        this._normal = normal;
    }

    private getCenterAndNormal(model: c3d.Curve3D) {
        if (model.IsStraight()) {
            const [start, end] = [point2point(model.GetLimitPoint(1)), point2point(model.GetLimitPoint(2))];
            const center = start.clone().add(end).multiplyScalar(0.5);
            const normal = start.clone().sub(end).normalize().cross(this.constructionPlane.n).normalize();
            return { center, normal };
        } else {
            const t = (model.GetTMin() + model.GetTMax()) / 2;
            const center = point2point(model.PointOn(t));
            const normal = vec2vec(model.Normal(t), 1);
            return { center, normal };
        }
    }

    set edges(edges: visual.CurveEdge[]) {
        const curves = edges.map(e => this.db.lookupTopologyItem(e).MakeCurve()!);
        const contours = c3d.ActionCurve3D.CreateContours(curves, 10);
        if (contours.length !== 1) console.warn("Not one unique contour");
        const model = contours[0];
        this.model = model;
        const { center, normal } = this.getCenterAndNormal(model);
        this._center = center;
        this._normal = normal;
    }

    private names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.Curve3DCreator, this.db.version), c3d.ESides.SideNone, 0)

    private readonly distVec = new THREE.Vector3();
    async calculate() {
        const { model: curve, distance, names } = this;
        const { distVec } = this;
        if (distance === 0) return new c3d.SpaceInstance(curve);
        const dist = unit(distance);

        if (curve.IsStraight()) {
            const dup = curve.Duplicate().Cast<c3d.Curve3D>(curve.IsA());
            dup.Move(vec2vec(distVec.copy(this._normal).multiplyScalar(dist), 1));
            return new c3d.SpaceInstance(dup);
        } if (curve.IsPlanar()) {
            const result = await c3d.ActionSurfaceCurve.OffsetPlaneCurve_async(curve, dist);
            return new c3d.SpaceInstance(result);
        } else {
            const vec = new c3d.Vector3D(dist, 0, 0);
            const params = new c3d.SpatialOffsetCurveParams(vec, names);
            const wireframe = await c3d.ActionSurfaceCurve.OffsetCurve_async(curve, params);
            return new c3d.SpaceInstance(wireframe.GetCurves()[0]);
        }
    }
}

// NOTE: this should be unnecessary in future releases of c3d
function repairUnclosedContour(result: c3d.Curve3D) {
    if (!result.IsClosed() && result.IsA() === c3d.SpaceType.ContourOnPlane) {
        const cop = result.Cast<c3d.ContourOnPlane>(result.IsA());
        const contour = cop.GetContour();
        const uEps = cop.GetSurface().GetUParamToUnit() * 10e-6;
        const vEps = cop.GetSurface().GetVParamToUnit() * 10e-6;
        const uvEps = Math.min(uEps, vEps);
        contour.InitClosed(true);
        c3d.ContourGraph.RemoveContourGaps(contour, 10 * uvEps, false, true);
        contour.CheckClosed(uvEps);
    }
}
