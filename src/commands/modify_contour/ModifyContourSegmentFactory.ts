import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import * as visual from '../../editor/VisualModel';
import { deunit, isSmoothlyConnected, point2point, unit, vec2vec } from '../../util/Conversion';
import { NoOpError, ValidationError } from '../GeometryFactory';
import { ContourFactory, CornerAngle, SegmentAngle } from "./ContourFilletFactory";

export interface ModifyContourSegmentParams {
    distance: number;
    segment: number;
}

interface OffsetPrecomputeInfo {
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

interface OffsetResult {
    before_extended: c3d.Curve3D;
    active_new: c3d.Curve3D | undefined;
    after_extended: c3d.Curve3D;
    radius: number;
}

export class ModifyContourSegmentFactory extends ContourFactory {
    distance = 0;

    get contour(): c3d.Contour3D { return super.contour }
    set contour(inst: c3d.Contour3D | c3d.SpaceInstance | visual.SpaceInstance<visual.Curve3D>) {
        super.contour = inst;
        this._segmentAngles = this.computeSegmentAngles();
    }

    private _segment!: number;
    get segment() { return this._segment }
    set segment(segment: number) {
        this._segment = segment;
        this.precompute()
    }

    private _segmentAngles!: SegmentAngle[];
    get segmentAngles() { return this._segmentAngles }
    private computeSegmentAngles(): SegmentAngle[] {
        const result: SegmentAngle[] = [];
        const contour = this.contour;
        const segments = contour.GetSegments();

        // NOTE: when this code was written there was a bug in normal computation SD#7281936 ... The manhattanLength() checks are a workaround
        for (const [i, segment] of segments.entries()) {
            const center = segment.GetWeightCentre();
            const { t } = contour.NearPointProjection(center, false);
            let normal = vec2vec(contour.Normal(t), 1);
            if (normal.manhattanLength() === 0) {
                const active_tangent_end = vec2vec(segment.Tangent(segment.GetTMax()), 1);
                const after = segments[(i + 1) % segments.length];
                const after_tangent_begin = vec2vec(after.Tangent(after.GetTMin()), 1).multiplyScalar(-1);
                const after_tangent_end = vec2vec(after.Tangent(after.GetTMax()), 1).multiplyScalar(-1);
                if (i + 1 >= segments.length) {
                    after_tangent_begin.multiplyScalar(-1);
                    after_tangent_end.multiplyScalar(-1);
                }
                normal.crossVectors(active_tangent_end, after_tangent_begin);
                if (normal.manhattanLength() < 10e-5) {
                    const before = segments[(i - 1 + segments.length) % segments.length];
                    const before_tangent_end = vec2vec(before.Tangent(before.GetTMax()), 1).multiplyScalar(-1);
                    const active_tangent_begin = vec2vec(segment.Tangent(segment.GetTMin()), 1);
                    normal.crossVectors(before_tangent_end, active_tangent_begin);
                }

                normal.cross(active_tangent_end).normalize();
            }

            result.push({
                origin: point2point(center),
                normal,
            });
        }
        return result;
    }

    private info!: OffsetPrecomputeInfo;
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
                before = new c3d.Line3D(point2point(offset), start);
                before_tmin = before.GetTMin();
                before_tmax = before.NearPointProjection(start, false).t;
                before_tangent_begin = vec2vec(before.Tangent(before_tmin), 1);
                before_tangent_end = before_tangent_begin;

                before_pmax = point2point(start);
            }

            if (index === segments.length - 1 && !contour.IsClosed()) {
                const end = active.GetLimitPoint(2);
                const normal = active_tangent_begin.clone().cross(before_tangent_end).cross(active_tangent_begin);
                const offset = point2point(end).sub(normal);
                after = new c3d.Line3D(end, point2point(offset));
                after_tmin = after.NearPointProjection(end, false).t;
                after_tmax = after.GetTMax();
                after_tangent_begin = vec2vec(after.Tangent(after_tmin), 1).multiplyScalar(-1);
                after_tangent_end = after_tangent_begin;
                after_pmin = point2point(end);
            }
        }

        const beforeIsAfter = segments.length === 2 && contour.IsClosed();
        this.info = { before, active, after, before_tangent_end, active_tangent_begin, active_tangent_end, after_tangent_begin, before_tmax, after_tmin, before_pmax, after_pmin, before_tmin, after_tmax, radiusBefore, radiusAfter, beforeIsAfter };
    }

    async calculate() {
        const { contour, segment: index, distance, info } = this;

        if (distance === 0) throw new NoOpError();

        const segments = contour.GetSegments();

        const { radiusBefore, radiusAfter, beforeIsAfter } = info;
        const { before_extended, active_new, after_extended, radius } = this.process(info);

        const outContour = new c3d.Contour3D();
        RebuildContour: {
            try {
                const isAtEnd = index === segments.length - 1;
                let isAtEndOfClosedContour = isAtEnd;
                isAtEndOfClosedContour ||= index === segments.length - 2 && radiusAfter > 0;
                isAtEndOfClosedContour &&= contour.IsClosed();
                const isAtEndOfOpenContour = isAtEnd && !contour.IsClosed();

                if (isAtEndOfClosedContour && segments.length > 2) outContour.AddCurveWithRuledCheck(after_extended, 1e-6, true);

                for (let i = 0 + (isAtEndOfClosedContour ? 1 : 0); i < index - 1 - (radiusBefore > 0 ? 1 : 0); i++) {
                    outContour.AddCurveWithRuledCheck(segments[i], 1e-6, true);
                }

                if (index > 0) outContour.AddCurveWithRuledCheck(before_extended, 1e-6, true);
                if (active_new) outContour.AddCurveWithRuledCheck(active_new, 1e-6, true);
                if (!isAtEndOfClosedContour && !isAtEndOfOpenContour && !beforeIsAfter) outContour.AddCurveWithRuledCheck(after_extended, 1e-6, true);

                let start = index + 2;
                if (radiusAfter > 0) start++;
                let end = segments.length;
                if (index === 0 && contour.IsClosed()) end--;
                if (index === 0 && radiusBefore > 0) end--;
                for (let i = start; i < end; i++) {
                    // AddCurveWithRuledCheck sometimes modifies the original curve, so duplicate:
                    outContour.AddCurveWithRuledCheck(segments[i].Duplicate().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D), 1e-6, true);
                }

                const isAtBeginningOfClosedContour = index === 0 && contour.IsClosed();
                if (isAtBeginningOfClosedContour) outContour.AddCurveWithRuledCheck(before_extended, 1e-6, true);
            } catch (e) {
                // In tests, fail fast. In production, show the intermediate results so I can debug.
                if (process.env.JEST_WORKER_ID) throw e;
                console.warn(e);
                return [before_extended, active_new, after_extended].map(c => c && new c3d.SpaceInstance(c)).filter(x => !!x) as c3d.SpaceInstance[];
            }
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

    private process(info: OffsetPrecomputeInfo): OffsetResult {
        const { before, active, after, active_tangent_begin, active_tangent_end, before_tmin, after_tmax, beforeIsAfter } = info;

        const before_tangent_end = info.before_tangent_end.clone();
        const after_tangent_begin = info.after_tangent_begin.clone();
        const before_pmax = info.before_pmax.clone();
        const after_pmin = info.after_pmin.clone();

        const { distance } = this;
        const pattern = `${c3d.SpaceType[before.GetBasisCurve().IsA()]}:${c3d.SpaceType[active.GetBasisCurve().IsA()]}:${c3d.SpaceType[after.GetBasisCurve().IsA()]}`;

        switch (pattern) {
            case 'Line3D:Polyline3D:Polyline3D':
            case 'Polyline3D:Polyline3D:Line3D':
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
            case 'Line3D:Arc3D:Line3D':
            case 'Line3D:Arc3D:Polyline3D':
            case 'Polyline3D:Arc3D:Line3D':
            case 'Polyline3D:Arc3D:Polyline3D': {
                const arc = active as c3d.Arc3D;
                const existingRadius = arc.GetRadius();
                if (isSmoothlyConnected(before, active, after)) {
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
                    const radius = deunit(existingRadius) - distance;
                    const active_new = arc.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                    active_new.MakeTrimmed(0, 2 * Math.PI);
                    active_new.SetRadius(unit(radius));

                    const before_line = new c3d.Line3D(before.GetLimitPoint(1), point2point(before_pmax));
                    const after_line = new c3d.Line3D(point2point(after_pmin), after.GetLimitPoint(2));

                    const { result1: before_extended_result, result2: active_new_before_result, count: count1 } = c3d.ActionPoint.CurveCurveIntersection3D(before_line, active_new, 1e-6);
                    if (count1 < 1) throw new ValidationError();
                    const before_line_t = Math.min(...before_extended_result.filter(t => t > 0));
                    const before_ext_p = before_line.PointOn(before_line_t);
                    const { t: before_ext_t } = before.NearPointProjection(before_ext_p, true)!;

                    const { result1: after_extended_result, result2: active_new_after_result, count: count2 } = c3d.ActionPoint.CurveCurveIntersection3D(after_line, active_new, 1e-6);
                    if (count2 < 1) throw new ValidationError();
                    const after_line_tmax = after_line.NearPointProjection(after.GetLimitPoint(2), false).t;
                    const after_line_t = Math.max(...after_extended_result.filter(t => t < after_line_tmax));
                    const after_ext_p = after_line.PointOn(after_line_t);
                    const { t: after_ext_t } = after.NearPointProjection(after_ext_p, true)!;

                    const index1 = before_extended_result.findIndex(v => v === before_line_t);
                    const index2 = after_extended_result.findIndex(v => v === after_line_t);
                    const active_new_tmin = before.IsA() === c3d.SpaceType.Line3D ? arc.GetTrim1() : active_new_before_result[index1];
                    const active_new_tmax = after.IsA() === c3d.SpaceType.Line3D ? arc.GetTrim2() : active_new_after_result[index2];

                    let before_extended, after_extended;
                    if (beforeIsAfter) {
                        active_new.MakeTrimmed(active_new_tmax, active_new_tmin);
                        before_extended = before.Trimmed(after_ext_t, before_ext_t, 1)!;
                        after_extended = before_extended;
                    } else {
                        active_new.MakeTrimmed(active_new_tmin, active_new_tmax);
                        before_extended = before.Trimmed(before_tmin, before_ext_t, 1)!;
                        after_extended = after.Trimmed(after_ext_t, after_tmax, 1)!;
                    }

                    return { before_extended, active_new, after_extended, radius: 0 }

                }
            }
            case 'Arc3D:Polyline3D:Arc3D': {
                const normal = this.segmentAngles[this.segment].normal.clone();
                normal.multiplyScalar(distance);

                const active_line = new c3d.Line3D(point2point(before_pmax), point2point(after_pmin));
                active_line.Move(vec2vec(normal));

                let before_extended = before.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                before_extended.MakeTrimmed(0, 2 * Math.PI);

                let after_extended = after.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                after_extended.MakeTrimmed(0, 2 * Math.PI);

                const { count: count2, result1: after_extended_result, result2: active_line_after_result } = c3d.ActionPoint.CurveCurveIntersection3D(after_extended, active_line, 10e-5);
                if (count2 < 1) throw new Error();
                const active_line_tmax = Math.min(...active_line_after_result.filter(t => t > 0));
                const index2 = active_line_after_result.findIndex(value => value === active_line_tmax);
                const after_ext_t = after_extended_result[index2];
                if (after_ext_t === undefined) throw new Error();

                if (beforeIsAfter) {
                    if (count2 !== 2) throw new Error();
                    before_extended.MakeTrimmed(after_extended_result[(index2 + 1) % 2], after_ext_t);
                    after_extended = before_extended;
                } else {
                    const { count: count1, result1: before_extended_result, result2: active_line_before_result } = c3d.ActionPoint.CurveCurveIntersection3D(before_extended, active_line, 10e-5);
                    if (count1 < 1) throw new Error();
                    const active_line_tmin = Math.max(...active_line_before_result.filter(t => t < active_line_tmax));
                    const index1 = active_line_before_result.findIndex((value) => value === active_line_tmin);
                    const before_ext_t = before_extended_result[index1];
                    if (before_ext_t === undefined) throw new Error();

                    before_extended.MakeTrimmed(before_tmin, before_ext_t);
                    after_extended.MakeTrimmed(after_ext_t, after_tmax);
                }

                const before_ext_p = before_extended.GetLimitPoint(2);
                const after_ext_p = after_extended.GetLimitPoint(1);

                const active_new: c3d.PolyCurve3D = new c3d.Polyline3D([before_ext_p, after_ext_p], false);
                const foo: c3d.Curve3D = active_new;
                return { before_extended, active_new, after_extended, radius: 0 };
            }
            case 'Polyline3D:Polyline3D:Arc3D':
            case 'Line3D:Polyline3D:Arc3D': {
                const normal = this.segmentAngles[this.segment].normal.clone();
                normal.multiplyScalar(distance);

                const active_line = new c3d.Line3D(active.GetLimitPoint(1), active.GetLimitPoint(2));
                active_line.Move(vec2vec(normal));

                const before_line = new c3d.Line3D(point2point(before_pmax), before.GetLimitPoint(1));

                let after_extended = after.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                after_extended.MakeTrimmed(0, 2 * Math.PI);

                const { result1: before_extended_result, count: count1 } = c3d.ActionPoint.CurveCurveIntersection3D(before_line, active_line, 1e-6);
                if (count1 < 1) throw new ValidationError();
                const before_line_t = Math.max(...before_extended_result);
                const before_ext_p = before_line.PointOn(before_line_t);
                const { t: before_ext_t } = before.NearPointProjection(before_ext_p, true)!;

                const { count: count2, result1: after_extended_result, result2: active_line_after_result } = c3d.ActionPoint.CurveCurveIntersection3D(after_extended, active_line, 10e-5);
                if (count2 < 1) throw new Error();

                const active_line_tmax = Math.min(...active_line_after_result);
                const index2 = active_line_after_result.findIndex((value) => value === active_line_tmax);
                const after_ext_t = after_extended_result[index2];

                after_extended.MakeTrimmed(after_ext_t, after_tmax);

                const after_ext_p = after_extended.GetLimitPoint(1);

                const before_extended = before.Trimmed(before_tmin, before_ext_t, 1)!;
                const active_new = new c3d.Polyline3D([before_ext_p, after_ext_p], false);
                return { before_extended, active_new, after_extended, radius: 0 };
            }
            case 'Arc3D:Polyline3D:Polyline3D':
            case 'Arc3D:Polyline3D:Line3D': {
                const normal = this.segmentAngles[this.segment].normal.clone();
                normal.multiplyScalar(distance);

                const active_line = new c3d.Line3D(point2point(before_pmax), point2point(after_pmin));
                active_line.Move(vec2vec(normal));

                const before_extended = before.Duplicate().Cast<c3d.Arc3D>(c3d.SpaceType.Arc3D);
                before_extended.MakeTrimmed(0, 2 * Math.PI);

                const after_line = new c3d.Line3D(point2point(after_pmin), after.GetLimitPoint(2));

                const { count: count1, result1: before_extended_result, result2: active_line_before_result } = c3d.ActionPoint.CurveCurveIntersection3D(before_extended, active_line, 10e-5);
                if (count1 < 1) throw new Error();
                const active_line_tmin = Math.max(...active_line_before_result);
                const index1 = active_line_before_result.findIndex((value) => value === active_line_tmin);
                const before_ext_t = before_extended_result[index1];
                if (before_ext_t === undefined) throw new Error();
                before_extended.MakeTrimmed(before_tmin, before_ext_t);

                const { result1: after_extended_result, count: count2 } = c3d.ActionPoint.CurveCurveIntersection3D(after_line, active_line, 1e-6);
                if (count2 < 1) throw new ValidationError();
                const after_line_t = Math.max(...after_extended_result);
                const after_ext_p = after_line.PointOn(after_line_t);
                const { t: after_ext_t } = after.NearPointProjection(after_ext_p, true)!;
                const after_extended = after.Trimmed(after_ext_t, after_tmax, 1)!;

                const before_ext_p = before_extended.GetLimitPoint(2);

                const active_new = new c3d.Polyline3D([before_ext_p, after_ext_p], false);
                return { before_extended, active_new, after_extended, radius: 0 };
            }
            default: throw new Error(pattern);
        }
    }
}