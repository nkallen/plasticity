import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';

export function point2point(from: THREE.Vector3, factor?: number): c3d.CartPoint3D;
export function point2point(from: THREE.Vector2, factor?: number): c3d.CartPoint;
export function point2point(from: c3d.CartPoint3D, factor?: number): THREE.Vector3;
export function point2point(from: c3d.FloatPoint3D, factor?: number): THREE.Vector3;
export function point2point(from: c3d.CartPoint, factor?: number): THREE.Vector2;
export function point2point(from: THREE.Vector3 | THREE.Vector2 | c3d.CartPoint3D | c3d.FloatPoint3D | c3d.CartPoint, factor = unit(1)): THREE.Vector3 | THREE.Vector2 | c3d.CartPoint3D | c3d.CartPoint {
    if (from instanceof c3d.CartPoint3D || from instanceof c3d.FloatPoint3D) {
        return new THREE.Vector3(from.x / factor, from.y / factor, from.z / factor);
    } else if (from instanceof c3d.CartPoint) {
        return new THREE.Vector2(from.x / factor, from.y / factor);
    } else if (from instanceof THREE.Vector2) {
        return new c3d.CartPoint(from.x * factor, from.y * factor);
    } else {
        return new c3d.CartPoint3D(from.x * factor, from.y * factor, from.z * factor);
    }
}

export function vec2vec(from: THREE.Vector3, factor?: number): c3d.Vector3D;
export function vec2vec(from: c3d.Vector3D, factor?: number): THREE.Vector3;
export function vec2vec(from: c3d.Vector, factor?: number): THREE.Vector2;
export function vec2vec(from: THREE.Vector3 | c3d.Vector3D | c3d.Vector, factor = unit(1)): THREE.Vector3 | THREE.Vector2 | c3d.Vector3D {
    if (from instanceof c3d.Vector3D) {
        return new THREE.Vector3(from.x / factor, from.y / factor, from.z / factor);
    } else if (from instanceof c3d.Vector) {
        return new THREE.Vector2(from.x / factor, from.y / factor);
    } else {
        return new c3d.Vector3D(from.x * factor, from.y * factor, from.z * factor);
    }
}

export function truncunit(x: number, precision?: number) {
    if (precision !== undefined) return trunc(unit(x), precision);
    else return unit(x);
}

export function trunc(x: number, precision: number) {
    return Math.trunc(x * precision) / precision;
}

export function unit(x: number): number {
    return x * 100;
}

export function deunit(x: number): number {
    return x / 100;
}

export function quat2axisAngle(quat: THREE.Quaternion): { axis: THREE.Vector3, angle: number } {
    const angle = 2 * Math.acos(quat.w);
    const d = Math.sqrt(1 - quat.w * quat.w);
    const axis = new THREE.Vector3(quat.x / d, quat.y / d, quat.z / d);
    return { axis, angle };
}

export function mat2mat(mat: c3d.Matrix3D, into?: THREE.Matrix4): THREE.Matrix4;
export function mat2mat(mat: THREE.Matrix4, into?: c3d.Matrix3D): c3d.Matrix3D;
export function mat2mat(mat: THREE.Matrix4 | c3d.Matrix3D, into?: THREE.Matrix4 | c3d.Matrix3D): THREE.Matrix4 | c3d.Matrix3D {
    if (mat instanceof c3d.Matrix3D) {
        if (into === undefined) into = new THREE.Matrix4();
        if (!(into instanceof THREE.Matrix4)) throw new Error();
        const row0 = mat.GetColumn(0);
        const row1 = mat.GetColumn(1);
        const row2 = mat.GetColumn(2);
        const row3 = mat.GetColumn(3);
        const col3 = mat.GetRow(3);
        into.set(
            row0.x, row0.y, row0.z, col3.x,
            row1.x, row1.y, row1.z, col3.y,
            row2.x, row2.y, row2.z, col3.z,
            row3.x, row3.y, row3.z, mat.El(3, 3),
        );
        return into;
    } else {
        if (into === undefined) into = new c3d.Matrix3D();
        if (!(into instanceof c3d.Matrix3D)) throw new Error();
        const elements = mat.elements;
        const col0 = new c3d.Homogeneous3D(elements[0], elements[1], elements[2], elements[3]);
        const col1 = new c3d.Homogeneous3D(elements[4], elements[5], elements[6], elements[7]);
        const col2 = new c3d.Homogeneous3D(elements[8], elements[9], elements[10], elements[11]);
        const col3 = new c3d.Homogeneous3D(elements[12], elements[13], elements[14], elements[15]);
        into.SetRow(0, col0);
        into.SetRow(1, col1);
        into.SetRow(2, col2);
        into.SetRow(3, col3);
        return into;
    }
}

export function inst2curve(instance: c3d.Item): c3d.Curve3D | undefined {
    if (!(instance instanceof c3d.SpaceInstance)) return;
    const item = instance.GetSpaceItem()!;
    const curve = item.Cast<c3d.Curve3D>(item.IsA());
    if (!(curve instanceof c3d.Curve3D)) return;
    return curve;
}

export type ContourAndPlacement = { curve: c3d.Curve, placement: c3d.Placement3D, surface?: c3d.Surface }

const X = new c3d.Axis3D(new c3d.Vector3D(1, 0, 0));
const Y = new c3d.Axis3D(new c3d.Vector3D(0, 1, 0));

// NOTE: right now this is a delicate balancing act and subject to revision
// Lines can be on an infinite number of planes.
// A hint is a strong preference for which plane a line should be on
// Without a hint, if a line is already associated with a plane, it's preferable to use that
// IsStraight(false) and IsStraight(true) behave differently. A hermit curve that happens to be straight will return true for one and not the other
export function curve3d2curve2d(curve3d: c3d.Curve3D, hint?: c3d.Placement3D, strict = false): ContourAndPlacement | undefined {
    if (hint === undefined && curve3d.IsPlanar() && curve3d.IsStraight()) {
        const { curve2d, placement } = curve3d.GetPlaneCurve(false, new c3d.PlanarCheckParams(0.01));
        const dup = curve2d.Duplicate().Cast<c3d.Curve>(c3d.PlaneType.Curve);
        return { curve: dup, placement };
    } else if (curve3d.IsStraight(true)) {
        hint ??= new c3d.Placement3D();
        let result;
        result = planarizeLine(curve3d, hint);
        if (result !== undefined) return result;
        if (strict) return;
        const rotatedX = new c3d.Placement3D(hint);
        rotatedX.Rotate(X, Math.PI / 2);
        result = planarizeLine(curve3d, rotatedX);
        if (result !== undefined) return result;
        const rotatedY = new c3d.Placement3D(hint);
        rotatedY.Rotate(Y, Math.PI / 2);
        return planarizeLine(curve3d, rotatedY);
    } else if (curve3d.IsPlanar()) {
        const { curve2d, placement } = curve3d.GetPlaneCurve(false, new c3d.PlanarCheckParams(0.01));
        const dup = curve2d.Duplicate().Cast<c3d.Curve>(c3d.PlaneType.Curve);
        return { curve: dup, placement };
    }
    return undefined;
}

function planarizeLine(curve3d: c3d.Curve3D, hint: c3d.Placement3D) {
    hint = new c3d.Placement3D(hint);
    const points2d = [];

    const inout = point2point(curve3d.GetLimitPoint(1));
    const origin = point2point(hint.GetOrigin());
    inout.sub(origin);
    const Z = vec2vec(hint.GetAxisZ(), 1);
    Z.multiplyScalar(Z.dot(inout));

    hint.Move(vec2vec(Z));

    for (const point of [curve3d.GetLimitPoint(1), curve3d.GetLimitPoint(2)]) {
        const location = hint.PointRelative(point, 10e-3);
        if (location !== c3d.ItemLocation.OnItem) return;
        const { x, y } = hint.PointProjection(point);
        points2d.push(new c3d.CartPoint(x, y));
    }
    const curve2d = c3d.ActionCurve.SplineCurve(points2d, false, c3d.PlaneType.Polyline);
    return { curve: curve2d, placement: hint };

}

export function normalizePlacement(curve2d: c3d.Curve, placement: c3d.Placement3D, candidates: Set<c3d.Placement3D>) {
    let bestExistingPlacement;
    for (const candidate of candidates) {
        if (isSamePlacement(placement, candidate)) {
            bestExistingPlacement = candidate;
            break;
        }
    }
    if (bestExistingPlacement === undefined) {
        candidates.add(placement);
        bestExistingPlacement = placement;
    }

    // Two objects can be coplanar but have different placements (e.g., different origins on XY, same Z axis);
    // Thus it's safest to normalize or else future operations like booleans may not work.
    const matrix = placement.GetMatrixToPlace(bestExistingPlacement);
    curve2d.Transform(matrix);

    return bestExistingPlacement;
}

export function isSamePlacement(placement1: c3d.Placement3D, placement2: c3d.Placement3D): boolean {
    const Z1 = placement1.GetAxisZ();
    const Z2 = placement2.GetAxisZ();
    const origin = point2point(placement2.GetOrigin());
    const delta = point2point(placement1.GetOrigin()).sub(origin);
    const ZdotOffset = Math.abs(vec2vec(Z1, 1).dot(delta));

    return Z1.Colinear(Z2) && ZdotOffset < 10e-4;
}

export function isSmoothlyConnected(before: c3d.Curve3D, active: c3d.Curve3D, after?: c3d.Curve3D): boolean {
    const active_tangent_begin = vec2vec(active.Tangent(active.GetTMin()), 1);
    const before_tangent_end = vec2vec(before.Tangent(before.GetTMax()), 1);
    const active_tangent_end = vec2vec(active.Tangent(active.GetTMax()), 1);
    let smooth1 = Math.abs(1 - Math.abs(before_tangent_end.dot(active_tangent_begin))) < 10e-5;
    smooth1 &&= point2point(before.GetLimitPoint(2)).manhattanDistanceTo(point2point(active.GetLimitPoint(1))) < 10e-3;
    if (after === undefined) return smooth1;

    const after_tangent_begin = vec2vec(after.Tangent(after.GetTMin()), 1);
    let smooth2 = Math.abs(1 - Math.abs(active_tangent_end.dot(after_tangent_begin))) < 10e-5;
    smooth2 &&= point2point(active.GetLimitPoint(2)).manhattanDistanceTo(point2point(after.GetLimitPoint(1))) < 10e-3;
    return smooth1 && smooth2;
}

export interface ControlPointInfo {
    index: number;
    origin: THREE.Vector3;
    segmentIndex: number;
    limit: -1 | 1 | 2;
}

export function computeControlPointInfo(contour: c3d.Contour3D): ControlPointInfo[] {
    const segments = contour.GetSegments();
    const allControlPoints = [];
    for (const [segmentIndex, segment] of segments.entries()) {
        if (segment.Type() === c3d.SpaceType.PolyCurve3D && segment.IsA() !== c3d.SpaceType.Polyline3D) {
            const polycurve = segment.Cast<c3d.PolyCurve3D>(segment.IsA());
            const points = polycurve.GetPoints();
            for (const [i, point] of points.entries()) {
                const limit = i === 0 ? 1 : -1;
                const info: ControlPointInfo = { origin: point2point(point), segmentIndex, limit, index: i }
                if (i === points.length - 1 && segmentIndex < segments.length - 1) break;
                allControlPoints.push(info);
            }
        } else {
            const info: ControlPointInfo = { origin: point2point(segment.GetLimitPoint(1)), segmentIndex, limit: 1, index: -1 }
            allControlPoints.push(info);
        }
    }
    const lastSegmentIndex = segments.length - 1;
    const info: ControlPointInfo = { origin: point2point(contour.GetLimitPoint(2)), segmentIndex: lastSegmentIndex, limit: 2, index: -1 }
    const lastSegment = segments[lastSegmentIndex];
    const lastSegmentIsPolyCurve = lastSegment.Type() === c3d.SpaceType.PolyCurve3D && lastSegment.IsA() !== c3d.SpaceType.Polyline3D;
    if (!contour.IsClosed() && !lastSegmentIsPolyCurve) allControlPoints.push(info);

    const result = [];
    for (const info of allControlPoints.values()) {
        result.push({ ...info });
    }
    return result;
}

export interface CornerAngle {
    index: number;
    origin: THREE.Vector3;
    tau: THREE.Vector3;
    axis: THREE.Vector3;
    angle: number;
}

export function cornerInfo(contour: c3d.Contour3D): Map<number, CornerAngle> {
    const allCorners = new Map<number, CornerAngle>();
    const segmentCount = contour.GetSegmentsCount();
    for (let i = 1, l = segmentCount; i < l; i++) {
        try {
            const info = contour.GetCornerAngle(i);
            allCorners.set(i, convertCornerAngleInfo(i - 1, info));
        } catch (e) { }
    }
    if (contour.IsClosed()) {
        try {
            const start = convertCornerAngleInfo(segmentCount - 1, contour.GetCornerAngle(segmentCount));
            allCorners.set(0, start);
        } catch (e) { }
    }
    return allCorners;
}

function convertCornerAngleInfo(index: number, info: ReturnType<c3d.Contour3D["GetCornerAngle"]>) {
    return {
        index,
        origin: point2point(info.origin),
        tau: vec2vec(info.tau, 1),
        axis: vec2vec(info.axis, 1),
        angle: info.angle,
    }
}

export function composeMainName(type: c3d.CreatorType, clock: number): number {
    type &= 0b1111111111;
    type <<= 32 - 10;
    type |= clock;
    return type;
}

export function decomposeMainName(mainName: number): [number, number] {
    let type = mainName;
    let clock = mainName;
    type >>= 32 - 10;
    type &= 0b1111111111;
    clock <<= 10;
    clock >>= 10;
    return [type, clock];
}

function polyline2segments(polyline: c3d.Polyline3D): c3d.Polyline3D[] {
    const points = polyline.GetPoints();
    if (points.length < 2) throw new Error("invalid precondition");
    let prev = points.shift()!;
    const start = prev;
    const segments: c3d.Polyline3D[] = [];
    for (const curr of points) {
        const segment = new c3d.Polyline3D([prev, curr], false);
        segments.push(segment);
        prev = curr;
    }
    if (polyline.IsClosed()) {
        const segment = new c3d.Polyline3D([prev, start], false);
        segments.push(segment);
    }
    return segments;
}

export async function polyline2contour(polyline: c3d.Polyline3D): Promise<c3d.Contour3D> {
    const segments = polyline2segments(polyline);
    const contours = await c3d.ActionCurve3D.CreateContours_async(segments, 1e-3);
    return contours[0];
}

export async function normalizeCurve(curve: c3d.Curve3D): Promise<c3d.Contour3D> {
    const result = new c3d.Contour3D();
    const process: c3d.Curve3D[] = [curve];
    while (process.length > 0) {
        const item = process.shift()!;
        const cast = item.constructor === c3d.Curve3D ? item.Cast<c3d.Curve3D>(item.IsA()) : item;
        if (cast instanceof c3d.LineSegment3D) {
            result.AddCurveWithRuledCheck(new c3d.Polyline3D([cast.GetLimitPoint(1), cast.GetLimitPoint(2)], false), 10e-5, true);
        } else if (cast instanceof c3d.Polyline3D) {
            const segments = polyline2segments(cast);
            for (const seg of segments) {
                result.AddCurveWithRuledCheck(seg, 10e-5, true);
            }
        } else if (cast instanceof c3d.Contour3D) {
            for (const segment of cast.GetSegments().reverse()) process.unshift(segment);
        } else if (cast instanceof c3d.TrimmedCurve3D) {
            const basis = cast.GetBasisCurve();
            const bcast = basis.Cast<c3d.Curve3D>(basis.IsA());
            if (bcast instanceof c3d.Polyline3D) {
                const originalPoints = bcast.GetPoints();
                const ts = [...Array(originalPoints.length).keys()];
                const tmin = bcast.GetTMin();
                const tmax = bcast.GetTMax();
                const keep = ts.filter(t => t > tmin && t < tmax);
                const points = [bcast.GetLimitPoint(1), ...keep.map(t => bcast._PointOn(t)), bcast.GetLimitPoint(2)];
                result.AddCurveWithRuledCheck(new c3d.Polyline3D(points, false), 10e-5, true);
            } else {
                console.warn("Unsupported trimmed curve: " + c3d.SpaceType[basis.IsA()]);
                result.AddCurveWithRuledCheck(cast.Duplicate().Cast<c3d.Curve3D>(cast.IsA()), 10e-5, true);
            }
        } else if (cast instanceof c3d.PlaneCurve) {
            const { placement, curve2d } = cast.GetPlaneCurve(false);
            const curve3d = curve2d2curve3d(curve2d, placement);
            process.unshift(curve3d);
        } else if (cast instanceof c3d.SurfaceIntersectionCurve) {
            process.unshift(cast.GetSpaceCurve()!);
        } else if (cast instanceof c3d.ContourOnPlane) {
            const placement = cast.GetPlacement();
            const contour = cast.GetContour();
            for (let i = contour.GetSegmentsCount() - 1; i >= 0; i--) {
                const segment = contour.GetSegment(i)!;
                process.unshift(new c3d.PlaneCurve(placement, segment, false))
            }
        } else {
            result.AddCurveWithRuledCheck(item.Duplicate().Cast<c3d.Curve3D>(item.IsA()), 10e-5, true);
        }
    }
    return result;
}

export function curve2d2curve3d(curve: c3d.Curve, placement: c3d.Placement3D): c3d.Curve3D {
    const cast = curve.Cast<c3d.Curve>(curve.IsA());
    if (cast instanceof c3d.LineSegment) {
        const p1_2d = cast.GetPoint1();
        const p2_2d = cast.GetPoint2();
        const p1 = placement.GetPointFrom(p1_2d.x, p1_2d.y, 0);
        const p2 = placement.GetPointFrom(p2_2d.x, p2_2d.y, 0);
        return new c3d.Polyline3D([p1, p2], false);
    } else if (cast instanceof c3d.Contour) {
        const result = new c3d.Contour3D();
        for (let i = 0, l = cast.GetSegmentsCount(); i < l; i++) {
            const segment2d = cast.GetSegment(i)!;
            const segment3d = curve2d2curve3d(segment2d, placement);
            result.AddCurveWithRuledCheck(segment3d);
        }
        return result;
    } else if (cast instanceof c3d.Arc) {
        return new c3d.Arc3D(cast, placement);
    } else if (cast instanceof c3d.Nurbs) {
        return c3d.Nurbs3D.Create(cast, placement)!;
    } else if (cast instanceof c3d.Polyline) {
        return new c3d.Polyline3D(cast, placement)!;
    } else if (cast instanceof c3d.CubicSpline) {
        return c3d.CubicSpline3D.Create(cast, placement)!;
    } else {
        throw new Error("Unsupported curve: " + cast.constructor.name);
    }
}

export function toArray<T>(x: T | T[] | undefined): T[] {
    if (x === undefined) return [];
    if (Array.isArray(x)) return x;
    else return [x];
}
