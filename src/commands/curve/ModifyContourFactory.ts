import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { deunit, isSmoothlyConnected, point2point, unit, vec2vec } from '../../util/Conversion';
import { NoOpError, ValidationError } from '../GeometryFactory';
import { ContourFactory, CornerAngle, SegmentAngle } from "./ContourFilletFactory";

type Mode = 'fillet' | 'offset';
export interface ModifyContourParams {
    mode: 'fillet' | 'offset';
    distance: number;
    segment: number;
    segmentAngles: SegmentAngle[];
    cornerAngles: CornerAngle[];
    radiuses: number[];
}

interface Info {
    before: c3d.Curve3D,
    active: c3d.Curve3D,
    after: c3d.Curve3D,
    before_tangent_end: THREE.Vector3,
    active_tangent_begin: THREE.Vector3,
    active_tangent_end: THREE.Vector3,
    after_tangent_begin: THREE.Vector3,
    before_pmax: THREE.Vector3,
    after_pmin: THREE.Vector3,
    before_tmin: number,
    before_tmax: number,
    after_tmax: number,
    after_tmin: number,
    radiusBefore: number,
    radiusAfter: number,
    beforeIsAfter: boolean;
}

interface Offset {
    before_extended: c3d.Curve3D;
    active_new: c3d.Curve3D | undefined;
    after_extended: c3d.Curve3D;
    radius: number;
}

export class ModifyContourFactory extends ContourFactory implements ModifyContourParams {
    mode: Mode = 'offset';
    distance = 0;

    async calculate() {
        switch (this.mode) {
            case 'fillet':
                return this.calculateFillet();
            case 'offset':
                return this.calculateOffset();
        }
    }

    private _segment!: number;
    get segment() { return this._segment }
    set segment(segment: number) {
        this._segment = segment;
        this.precompute()
    }

    get segmentAngles(): SegmentAngle[] {
        const result: SegmentAngle[] = [];
        const contour = this.contour;
        const segments = contour.GetSegments();

        for (const [i, segment] of segments.entries()) {
            const center = segment.GetWeightCentre();
            const { t } = contour.NearPointProjection(center, false);
            let normal = vec2vec(contour.Normal(t), 1);
            if (normal.manhattanLength() === 0) {
                const active_tangent_end = vec2vec(segment.Tangent(segment.GetTMax()), 1);
                const after = segments[(i + 1) % segments.length];
                const after_tmin = after.GetTMin();
                const after_tmax = after.GetTMax();
                const after_tangent_begin = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
                const after_tangent_end = vec2vec(after.Tangent(after_tmax), 1).multiplyScalar(-1);
                normal.crossVectors(active_tangent_end, after_tangent_begin);
                if (normal.manhattanLength() < 10e-5) normal.crossVectors(active_tangent_end, after_tangent_end);

                normal.cross(active_tangent_end).normalize();
            }

            result.push({
                origin: point2point(center),
                normal,
            });
        }
        return result;
    }

    private info!: Info;
    protected precompute() {
        const { contour, segment: index, distance } = this;

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

        if (before instanceof c3d.Arc3D && isSmoothlyConnected(before, active)) {
            radiusBefore = deunit(before.GetRadius());

            const before_before = segments[(index - 2 + segments.length) % segments.length];

            const before_before_tmin = before_before.GetTMin();
            const before_before_tmax = before_before.GetTMax();
            const before_before_tangent_begin = vec2vec(before_before.Tangent(before_before_tmin), 1);
            const before_before_tangent_end = vec2vec(before_before.Tangent(before_before_tmax), 1);
            if (isSmoothlyConnected(before_before, before, active)) {
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

        if (after instanceof c3d.Arc3D && isSmoothlyConnected(active, after)) {
            radiusAfter = deunit(after.GetRadius());

            const after_after = segments[(index + 2) % segments.length];

            const after_after_tmin = after_after.GetTMin();
            const after_after_tmax = after_after.GetTMax();

            const after_after_tangent_begin = vec2vec(after_after.Tangent(after_after_tmin), 1).multiplyScalar(-1);
            const after_after_tangent_end = vec2vec(after_after.Tangent(after_after_tmax), 1).multiplyScalar(-1);
            if (isSmoothlyConnected(active, after, after_after)) {
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

        const beforeIsAfter = segments.length === 2 && contour.IsClosed();
        this.info = { before, active, after, before_tangent_end, active_tangent_begin, active_tangent_end, after_tangent_begin, before_tmax, after_tmin, before_pmax, after_pmin, before_tmin, after_tmax, radiusBefore, radiusAfter, beforeIsAfter };
    }

    async calculateOffset() {
        const { contour, segment: index, distance, info } = this;

        if (distance === 0) throw new NoOpError();

        const segments = contour.GetSegments();

        const { radiusBefore, radiusAfter } = info;
        const { before_extended, active_new, after_extended, radius } = this.process(info);

        const outContour = new c3d.Contour3D();
        RebuildContour: {
            let isAtEndOfClosedContour = index === segments.length - 1 && contour.IsClosed();
            isAtEndOfClosedContour ||= index === segments.length - 2 && radiusAfter > 0 && contour.IsClosed();
            if (isAtEndOfClosedContour && segments.length > 2) outContour.AddCurveWithRuledCheck(after_extended, 1e-6, true);

            for (let i = 0 + (isAtEndOfClosedContour ? 1 : 0); i < index - 1 - (radiusBefore > 0 ? 1 : 0); i++) {
                outContour.AddCurveWithRuledCheck(segments[i], 1e-6, true);
            }

            if (index > 0) outContour.AddCurveWithRuledCheck(before_extended, 1e-6, true);
            if (active_new) outContour.AddCurveWithRuledCheck(active_new, 1e-6, true);
            if (!isAtEndOfClosedContour) outContour.AddCurveWithRuledCheck(after_extended, 1e-6, true);

            let start = index + 2;
            if (radiusAfter > 0) start++;
            let end = segments.length;
            if (index === 0) end--;
            if (index === 0 && radiusBefore > 0) end--;
            for (let i = start; i < end; i++) {
                // AddCurveWithRuledCheck sometimes modifies the original curve, so duplicate:
                outContour.AddCurveWithRuledCheck(segments[i].Duplicate().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D), 1e-6, true);
            }

            const isAtBeginningOfClosedContour = index === 0 && contour.IsClosed();
            if (isAtBeginningOfClosedContour) outContour.AddCurveWithRuledCheck(before_extended, 1e-6, true);
        }

        if (radiusBefore === 0 && radius === 0 && radiusAfter === 0) return new c3d.SpaceInstance(outContour);
        else {
            let numFillets = 0;
            if (radiusBefore > 0) numFillets++;
            if (radiusAfter > 0) numFillets++;
            if (radius > 0) numFillets++;
            const numSegmentsWithoutFillets = segments.length - numFillets;

            let newPosition = index;
            if (radiusBefore && index > 0) newPosition--;

            const fillNumber = numSegmentsWithoutFillets - (this.contour.IsClosed() ? 0 : 1);
            const radiuses = new Array<number>(fillNumber);
            radiuses.fill(0);

            radiuses[(newPosition - 1 + fillNumber) % fillNumber] = radiusBefore;
            if (radius !== 0) radiuses[newPosition - 1] = radius;
            else if (radiusAfter !== 0) radiuses[newPosition] = radiusAfter;

            const result = c3d.ActionSurfaceCurve.CreateContourFillets(outContour, radiuses.map(unit), c3d.ConnectingType.Fillet);
            return new c3d.SpaceInstance(result);
        }
    }

    async calculateFillet() {
        const { contour, radiuses } = this;

        const result = c3d.ActionSurfaceCurve.CreateContourFillets(contour, radiuses.map(unit), c3d.ConnectingType.Fillet);
        return new c3d.SpaceInstance(result);
    }

    private process(info: Info): Offset {
        const { before, active, after, active_tangent_begin, active_tangent_end, before_tmin, after_tmax, beforeIsAfter } = info;

        const before_tangent_end = info.before_tangent_end.clone();
        const after_tangent_begin = info.after_tangent_begin.clone();
        const before_pmax = info.before_pmax.clone();
        const after_pmin = info.after_pmin.clone();

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
                if (isSmoothlyConnected(before, active, after)) {
                    const existingRadius = (active as c3d.Arc3D).GetRadius();
                    const radius = deunit(existingRadius) + distance / 2;
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
                } else {
                    // FIXME
                    throw new Error("Not implemented");
                }
            }
            case 'Arc3D:Polyline3D:Arc3D': {
                const normal = active_tangent_begin.clone().cross(before_tangent_end).cross(active_tangent_begin).normalize();
                normal.multiplyScalar(distance);

                const active_line = new c3d.Line3D(point2point(before_pmax), point2point(after_pmin));
                active_line.Move(vec2vec(normal));

                const before_extended = before.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                before_extended.MakeTrimmed(0, 2 * Math.PI);

                let after_extended = after.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                after_extended.MakeTrimmed(0, 2 * Math.PI);

                const { count: count1, result1: before_extended_result, result2: active_line_before_result } = c3d.ActionPoint.CurveCurveIntersection3D(before_extended, active_line, 10e-5);
                if (count1 < 1) throw new Error();

                const active_line_tmin = Math.max(...active_line_before_result);
                const index1 = active_line_before_result.findIndex((value) => value === active_line_tmin);
                const before_ext_t = before_extended_result[index1];

                const { count: count2, result1: after_extended_result, result2: active_line_after_result } = c3d.ActionPoint.CurveCurveIntersection3D(after_extended, active_line, 10e-5);
                if (count2 < 1) throw new Error();

                const active_line_tmax = Math.min(...active_line_after_result);
                const index2 = active_line_after_result.findIndex((value) => value === active_line_tmax);
                const after_ext_t = after_extended_result[index2];

                if (before_ext_t === undefined) throw new Error();
                if (after_ext_t === undefined) throw new Error();

                if (beforeIsAfter) {
                    before_extended.MakeTrimmed(before_ext_t, after_ext_t);
                    after_extended = before_extended;
                } else {
                    before_extended.MakeTrimmed(before_tmin, before_ext_t);
                    after_extended.MakeTrimmed(after_ext_t, after_tmax);
                }

                const before_ext_p = before_extended.GetLimitPoint(2);
                const after_ext_p = after_extended.GetLimitPoint(1);

                const active_new = new c3d.Polyline3D([before_ext_p, after_ext_p], false);
                return { before_extended, active_new, after_extended, radius: 0 };
            }
            default: throw new Error(pattern);
        }
    }
}