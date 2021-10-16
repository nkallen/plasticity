import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";
import * as visual from '../editor/VisualModel';

export function point2point(from: THREE.Vector3): c3d.CartPoint3D;
export function point2point(from: c3d.CartPoint3D): THREE.Vector3;
export function point2point(from: c3d.CartPoint): THREE.Vector2;
export function point2point(from: THREE.Vector3 | c3d.CartPoint3D | c3d.CartPoint): THREE.Vector3 | THREE.Vector2 | c3d.CartPoint3D {
    if (from instanceof c3d.CartPoint3D) {
        return new THREE.Vector3(from.x / 100, from.y / 100, from.z / 100);
    } else if (from instanceof c3d.CartPoint) {
        return new THREE.Vector2(from.x / 100, from.y / 100);
    } else {
        return new c3d.CartPoint3D(from.x * 100, from.y * 100, from.z * 100);
    }
}

export function vec2vec(from: THREE.Vector3, factor?: number): c3d.Vector3D;
export function vec2vec(from: c3d.Vector3D, factor?: number): THREE.Vector3;
export function vec2vec(from: c3d.Vector, factor?: number): THREE.Vector2;
export function vec2vec(from: THREE.Vector3 | c3d.Vector3D | c3d.Vector, factor = 100): THREE.Vector3 | THREE.Vector2 | c3d.Vector3D {
    if (from instanceof c3d.Vector3D) {
        return new THREE.Vector3(from.x / factor, from.y / factor, from.z / factor);
    } else if (from instanceof c3d.Vector) {
        return new THREE.Vector2(from.x / factor, from.y / factor);
    } else {
        return new c3d.Vector3D(from.x * factor, from.y * factor, from.z * factor);
    }
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

export type ContourAndPlacement = { curve: c3d.Curve, placement: c3d.Placement3D }

export function curve3d2curve2d(curve3d: c3d.Curve3D, hint: c3d.Placement3D): ContourAndPlacement | undefined {
    if (curve3d.IsStraight(true)) {
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
    } else if (curve3d.IsPlanar()) {
        const { curve2d, placement } = curve3d.GetPlaneCurve(false, new c3d.PlanarCheckParams(0.01));

        const dup = curve2d.Duplicate().Cast<c3d.Curve>(c3d.PlaneType.Curve);
        return { curve: dup, placement };
    }
    return undefined;
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

    // To objects can be coplanar but have different placements (e.g., different origins on XY, same Z axis);
    // Thus it's safest to normalize or else future operations like booleans may not work.
    const matrix = placement.GetMatrixToPlace(bestExistingPlacement);
    curve2d.Transform(matrix);

    return bestExistingPlacement;
}

export function isSamePlacement(placement1: c3d.Placement3D, placement2: c3d.Placement3D): boolean {
    const Z = placement1.GetAxisZ();
    const origin = point2point(placement2.GetOrigin());
    const delta = point2point(placement1.GetOrigin()).sub(origin);
    const ZdotOffset = Math.abs(vec2vec(Z, 1).dot(delta));

    return Z.Colinear(placement2.GetAxisZ()) && ZdotOffset < 10e-4;
}