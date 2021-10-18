import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { inst2curve, point2point, unit, vec2vec } from '../../util/Conversion';
import { NoOpError, ValidationError } from '../GeometryFactory';
import { ContourFactory } from "./ContourFilletFactory";

export interface SegmentAngle {
    origin: THREE.Vector3;
    normal: THREE.Vector3;
}

export interface ModifyContourParams {
    distance: number;
    segment: number;
    segmentAngles: SegmentAngle[];
}

interface Info {
    before_tangent_end: THREE.Vector3,
    active_tangent_begin: THREE.Vector3,
    active_tangent_end: THREE.Vector3,
    after_tangent_begin: THREE.Vector3,
    before_pmax: THREE.Vector3,
    after_pmin: THREE.Vector3,
    before_tmin: number,
    after_tmax: number
}

interface Offset {
    before_extended: c3d.Curve3D;
    active_new: c3d.Curve3D | undefined;
    after_extended: c3d.Curve3D;
    radius: number;
}

export class ModifyContourFactory extends ContourFactory implements ModifyContourParams {
    private _contour!: c3d.Contour3D;
    get contour(): c3d.Contour3D { return this._contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        if (inst instanceof c3d.SpaceInstance) {
            const curve = inst2curve(inst);
            if (!(curve instanceof c3d.Contour3D)) throw new ValidationError("Contour expected");
            this._contour = curve;
        } else if (inst instanceof visual.SpaceInstance) {
            this.contour = this.db.lookup(inst);
            return;
        } else this._contour = inst;

        let fillNumber = this.contour.GetSegmentsCount();
    }

    distance = 0;
    segment!: number;

    async calculate() {
        const { contour, segment: index, distance } = this;

        if (distance === 0) throw new NoOpError();

        const segments = contour.GetSegments();

        let active = segments[index];
        let before = segments[(index - 1 + segments.length) % segments.length];
        let after = segments[(index + 1) % segments.length];

        before = before.Cast<c3d.Curve3D>(before.IsA());
        after = after.Cast<c3d.Curve3D>(after.IsA());
        active = active.Cast<c3d.Curve3D>(active.IsA());

        let before_tmin = before.GetTMin();
        let before_tmax = before.GetTMax();
        let after_tmin = after.GetTMin();
        let after_tmax = after.GetTMax();

        let before_tangent_begin = vec2vec(before.Tangent(before_tmin), 1);
        let before_tangent_end = vec2vec(before.Tangent(before_tmax), 1);
        let after_tangent_begin = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
        let after_tangent_end = vec2vec(after.Tangent(after_tmax), 1).multiplyScalar(-1);

        const active_tangent_begin = vec2vec(active.Tangent(active.GetTMin()), 1);
        const active_tangent_end = vec2vec(active.Tangent(active.GetTMax()), 1);

        let before_pmax = point2point(before.GetLimitPoint(2));
        let after_pmin = point2point(after.GetLimitPoint(1));
        let radiusBefore = 0;
        let radiusAfter = 0;

        if (before instanceof c3d.Arc3D) {
            radiusBefore = before.GetRadius();

            const before_before = segments[(index - 2 + segments.length) % segments.length];

            const before_before_tmin = before_before.GetTMin();
            const before_before_tmax = before_before.GetTMax();
            const before_before_tangent_begin = vec2vec(before_before.Tangent(before_before_tmin), 1);
            const before_before_tangent_end = vec2vec(before_before.Tangent(before_before_tmax), 1);
            const smooth1 = Math.abs(1 - before_before_tangent_begin.dot(before_tangent_begin)) < 10e-5;
            const smooth2 = Math.abs(1 - before_tangent_end.dot(active_tangent_begin)) < 10e-5;
            if (smooth1 && smooth2) {
                before = before_before.Cast<c3d.Curve3D>(before_before.IsA());
                before_tmin = before_before_tmin;
                const before_before_pmax = before.GetLimitPoint(2);
                const before_before_ext_p = point2point(before_before_pmax).add(before_before_tangent_end);
                const active_pmin = before_pmax;
                const active_ext_p = active_pmin.clone().add(active_tangent_begin);
                const before_before_line = new c3d.Line3D(before_before_pmax, point2point(before_before_ext_p));
                const active_line = new c3d.Line3D(point2point(active_pmin), point2point(active_ext_p));
                const { result1, count } = c3d.ActionPoint.CurveCurveIntersection3D(before_before_line, active_line, 10e-6);
                if (count < 1) throw new Error("Invalid precondition");

                const p = before_before_line._PointOn(result1[0]);
                before_pmax = point2point(p);
                const { t } = before.NearPointProjection(p, true);
                before_tmax = t;

                before_tangent_begin = before_before_tangent_begin;
                before_tangent_end = before_before_tangent_end;
            }
        }

        if (after instanceof c3d.Arc3D) {
            radiusAfter = after.GetRadius();

            const after_after = segments[(index + 2) % segments.length];

            const after_after_tmin = after_after.GetTMin();
            const after_after_tmax = after_after.GetTMax();

            const after_after_tangent_begin = vec2vec(after_after.Tangent(after_after_tmin), 1).multiplyScalar(-1);
            const after_after_tangent_end = vec2vec(after_after.Tangent(after_after_tmax), 1).multiplyScalar(-1);
            const smooth1 = Math.abs(1 - Math.abs(after_after_tangent_begin.dot(after_tangent_end))) < 10e-5;
            const smooth2 = Math.abs(1 - Math.abs(after_tangent_begin.dot(active_tangent_end))) < 10e-5;
            if (smooth1 && smooth2) {
                after = after_after.Cast<c3d.Curve3D>(after_after.IsA());
                after_tmax = after_after_tmax;
                const after_after_pmin = after.GetLimitPoint(1);
                const after_after_ext_p = point2point(after_after_pmin).add(after_after_tangent_begin);
                const active_pmax = after_pmin;
                const active_ext_p = active_pmax.clone().add(active_tangent_end);
                const after_after_line = new c3d.Line3D(after_after_pmin, point2point(after_after_ext_p));
                const active_line = new c3d.Line3D(point2point(active_pmax), point2point(active_ext_p));
                const { result1, count } = c3d.ActionPoint.CurveCurveIntersection3D(after_after_line, active_line, 10e-6);
                if (count < 1) throw new Error("Invalid precondition");

                const p = after_after_line._PointOn(result1[0]);
                after_pmin = point2point(p);
                const { t } = after.NearPointProjection(p, true);
                after_tmin = t;

                after_tangent_begin = after_after_tangent_begin;
                after_tangent_end = after_after_tangent_end;
            }
        }

        MakeVirtualBeforeAndAfterIfAtEndOfOpenContour: {
            if (index === 0 && !contour.IsClosed()) {
                const start = active.GetLimitPoint(1);
                const normal = active_tangent_end.clone().cross(after_tangent_begin).cross(active_tangent_end).normalize();
                const offset = point2point(start).sub(normal);
                before = new c3d.Polyline3D([point2point(offset), start], false);
                before_tmin = before.GetTMin();
                before_tmax = before.GetTMax();
                before_tangent_begin = vec2vec(before.Tangent(before_tmin), 1);
                before_tangent_end = vec2vec(before.Tangent(before_tmax), 1);

                before_pmax = point2point(before.GetLimitPoint(2));
            }

            if (index === segments.length - 1 && !contour.IsClosed()) {
                const end = active.GetLimitPoint(2);
                const normal = active_tangent_begin.clone().cross(before_tangent_end).cross(active_tangent_begin);
                const offset = point2point(end).sub(normal);
                after = new c3d.Polyline3D([end, point2point(offset)], false);
                after_tmin = after.GetTMin();
                after_tmax = after.GetTMax();
                after_tangent_begin = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
                after_tangent_end = vec2vec(after.Tangent(after_tmax), 1).multiplyScalar(-1);
                after_pmin = point2point(after.GetLimitPoint(1));
            }
        }

        const info: Info = { before_tangent_end, active_tangent_begin, active_tangent_end, after_tangent_begin, before_pmax, after_pmin, before_tmin, after_tmax };
        const { before_extended, active_new, after_extended, radius } = this.process(before, active, after, info);

        const outContour = new c3d.Contour3D();
        RebuildContour: {
            const isAtEndOfClosedContour = index === segments.length - 1 && contour.IsClosed();
            if (isAtEndOfClosedContour) outContour.AddCurveWithRuledCheck(after_extended, 1e-6, true);

            for (let i = 0 + (isAtEndOfClosedContour ? 1 : 0); i < index - 1 - (radiusBefore > 0 ? 1 : 0); i++) {
                outContour.AddCurveWithRuledCheck(segments[i], 1e-6, true);
            }

            if (index > 0) outContour.AddCurveWithRuledCheck(before_extended, 1e-6, true);
            if (active_new) outContour.AddCurveWithRuledCheck(active_new, 1e-6, true);
            if (index < segments.length - 1) outContour.AddCurveWithRuledCheck(after_extended, 1e-6, true);

            let start = index + 2;
            if (radiusAfter > 0) start++;
            let end = segments.length;
            if (index === 0) end--;
            if (index === 0 && radiusBefore > 0) end--;
            for (let i = start; i < end; i++) {
                // AddCurveWithRuledCheck sometimes modifies the original curve, so duplicate:
                outContour.AddCurveWithRuledCheck(segments[i].Duplicate().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D), 1e-6, true);
            }

            if (index === 0 && contour.IsClosed()) outContour.AddCurveWithRuledCheck(before_extended, 1e-6, true);
        }

        if (radiusBefore === 0 && radius === 0 && radiusAfter === 0) return new c3d.SpaceInstance(outContour);
        else {
            let numFillets = 0;
            if (radiusBefore > 0) numFillets++;
            if (radiusAfter > 0) numFillets++;
            if (radius > 0) numFillets++;

            let fillNumber = segments.length - numFillets;
            fillNumber -= this.contour.IsClosed() ? 0 : 1;
            const radiuses = new Array<number>(fillNumber);
            radiuses.fill(0);
            if (numFillets < 2) {
                if (radiusBefore > 0 && index > 0) radiuses[(index - 2 + fillNumber) % fillNumber] = radiusBefore;
                else if (radiusBefore > 0) radiuses[fillNumber - 1] = radiusBefore;
                if (radiusAfter > 0) radiuses[index] = radiusAfter;
            } else {
                radiuses[index - 2] = radiusBefore;
                radiuses[index - 1] = radiusAfter;
            }
            radiuses[index - 1] = radius;
            const result = c3d.ActionSurfaceCurve.CreateContourFillets(outContour, radiuses, c3d.ConnectingType.Fillet);
            return new c3d.SpaceInstance(result);
        }
    }

    private process(before: c3d.Curve3D, active: c3d.Curve3D, after: c3d.Curve3D, info: Info): Offset {
        const { before_tangent_end, active_tangent_begin, active_tangent_end, after_tangent_begin, before_pmax, after_pmin, before_tmin, after_tmax } = info;
        const { distance } = this;
        const pattern = `${c3d.SpaceType[before.GetBasisCurve().IsA()]}:${c3d.SpaceType[active.GetBasisCurve().IsA()]}:${c3d.SpaceType[after.GetBasisCurve().IsA()]}`;

        switch (pattern) {
            case 'Polyline3D:Polyline3D:Polyline3D': {
                const beta = active_tangent_end.angleTo(after_tangent_begin);
                const gamma = active_tangent_begin.angleTo(before_tangent_end.multiplyScalar(-1));

                const before_distance = distance / Math.sin(gamma);
                const after_distance = distance / Math.sin(beta);

                const before_ext_p = point2point(before_pmax.add(before_tangent_end.multiplyScalar(-before_distance)));
                const after_ext_p = point2point(after_pmin.add(after_tangent_begin.multiplyScalar(after_distance)));

                const { t: before_ext_t } = before.NearPointProjection(before_ext_p, true);
                const { t: after_ext_t } = after.NearPointProjection(after_ext_p, true);
                const before_extended = before.Trimmed(before_tmin, before_ext_t, 1)!;
                const after_extended = after.Trimmed(after_ext_t, after_tmax, 1)!;

                const active_new = new c3d.Polyline3D([before_ext_p, after_ext_p], false);
                return { before_extended, active_new, after_extended, radius: 0 };
            }
            case 'Polyline3D:Arc3D:Polyline3D': {
                const existingRadius = (active as c3d.Arc3D).GetRadius();
                const radius = existingRadius - unit(distance);
                const before_line = new c3d.Line3D(point2point(before_pmax), point2point(before_pmax.clone().add(before_tangent_end)));
                const after_line = new c3d.Line3D(point2point(after_pmin), point2point(after_pmin.clone().add(after_tangent_begin)));
                const { result1, count } = c3d.ActionPoint.CurveCurveIntersection3D(before_line, after_line, 1e-6);
                if (count !== 1) throw new ValidationError();

                const intersection = before_line.PointOn(result1[0]);
                const { t: before_ext_t } = before.NearPointProjection(intersection, true);
                const { t: after_ext_t } = after.NearPointProjection(intersection, true);

                const before_extended = before.Trimmed(before_tmin, before_ext_t, 1)!;
                const after_extended = after.Trimmed(after_ext_t, after_tmax, 1)!;
                return { before_extended, active_new: undefined, after_extended, radius };
            }
            default: throw new Error(pattern);

        }
    }


    get segmentAngles(): SegmentAngle[] {
        const result: SegmentAngle[] = [];
        const contour = this._contour;
        const segments = contour.GetSegments();
        for (const [i, segment] of segments.entries()) {
            const center = segment.GetWeightCentre();
            const active_tangent_end = vec2vec(segment.Tangent(segment.GetTMax()), 1);
            const after = segments[(i + 1) % segments.length];
            const after_tmin = after.GetTMin();
            const after_tangent = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
            const normal = new THREE.Vector3();
            normal.crossVectors(active_tangent_end, after_tangent).cross(active_tangent_end).normalize();

            const { t } = segment.NearPointProjection(center, false);
            result.push({
                origin: point2point(center),
                normal,
            });
        }
        return result;
    }
}