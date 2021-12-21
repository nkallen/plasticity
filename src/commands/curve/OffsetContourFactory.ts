import * as visual from '../../visual_model/VisualModel';
import { composeMainName, point2point, unit, vec2vec } from '../../util/Conversion';
import c3d from '../../../build/Release/c3d.node';
import { GeometryFactory, NoOpError, ValidationError } from '../../command/GeometryFactory';
import * as THREE from "three";

export default class OffsetCurveFactory extends GeometryFactory {
    private offsetFace = new OffsetFaceFactory(this.db, this.materials, this.signals);
    private offsetCurve = new OffsetSpaceCurveFactory(this.db, this.materials, this.signals);

    set distance(d: number) {
        this.offsetFace.distance = d;
        this.offsetCurve.distance = d;
    }

    set face(f: visual.Face) { this.offsetFace.face = f }
    set curve(c: visual.SpaceInstance<visual.Curve3D>) { this.offsetCurve.curve = c }

    get center() {
        const { offsetCurve, offsetFace } = this;
        if (offsetCurve.curve !== undefined) return offsetCurve.center;
        if (offsetFace.curve !== undefined) return offsetFace.center;
        throw new ValidationError("no face or curve");
    }

    get normal() {
        const { offsetCurve, offsetFace } = this;
        if (offsetCurve.curve !== undefined) return offsetCurve.normal;
        if (offsetFace.curve !== undefined) return offsetFace.normal;
        throw new ValidationError("no face or curve");
    }

    async calculate() {
        const { offsetCurve, offsetFace } = this;
        if (offsetCurve.curve !== undefined) return offsetCurve.calculate();
        if (offsetFace.curve !== undefined) return offsetFace.calculate();
        throw new ValidationError("no face or curve");
    }
}

export class OffsetFaceFactory extends GeometryFactory {
    distance = 0;

    _center!: THREE.Vector3;
    get center() { return this._center }

    _normal!: THREE.Vector3;
    get normal() { return this._normal }

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

        const params = new c3d.SurfaceOffsetCurveParams(model, direction, unit(distance), names);
        const wireframe = await c3d.ActionSurfaceCurve.OffsetSurfaceCurve_async(curve, params);
        const curves = wireframe.GetCurves();

        return new c3d.SpaceInstance(curves[0]);
    }
}

export class OffsetSpaceCurveFactory extends GeometryFactory {
    distance = 0;

    private _center!: THREE.Vector3;
    get center() { return this._center }

    private _normal!: THREE.Vector3;
    get normal() { return this._normal }

    private _curve!: c3d.Curve3D;
    get curve() { return this._curve }
    set curve(curve: visual.SpaceInstance<visual.Curve3D> | c3d.Curve3D) {
        if (curve instanceof c3d.Curve3D) {
            this._curve = curve;
        } else {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;
            this._curve = item.Cast<c3d.Curve3D>(item.IsA());
            this._center = point2point(this._curve.GetLimitPoint(1));
            this._normal = vec2vec(this._curve.Normal(this._curve.GetTMin()), -1);
        }
    }

    private names = new c3d.SNameMaker(composeMainName(c3d.CreatorType.Curve3DCreator, this.db.version), c3d.ESides.SideNone, 0)

    async calculate() {
        const { _curve: curve, distance, names } = this;
        if (distance === 0) throw new NoOpError();

        const dist = unit(distance);
        if (curve.IsPlanar()) {
            const result = await c3d.ActionSurfaceCurve.OffsetPlaneCurve_async(curve, dist);
            return new c3d.SpaceInstance(result);
        } else {
            const vec = new c3d.Vector3D(0, dist, 0);
            const params = new c3d.SpatialOffsetCurveParams(vec, names);
            const wireframe = await c3d.ActionSurfaceCurve.OffsetCurve_async(curve, params);
            return new c3d.SpaceInstance(wireframe.GetCurves()[0]);
        }
    }
}