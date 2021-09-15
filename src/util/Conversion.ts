import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";

export function point2point(from: THREE.Vector3): c3d.CartPoint3D;
export function point2point(from: c3d.CartPoint3D): THREE.Vector3;
export function point2point(from: THREE.Vector3 | c3d.CartPoint3D): THREE.Vector3 | c3d.CartPoint3D {
    if (from instanceof c3d.CartPoint3D) {
        return new THREE.Vector3(from.x / 100, from.y / 100, from.z / 100);
    } else {
        return new c3d.CartPoint3D(from.x * 100, from.y * 100, from.z * 100);
    }
}

export function vec2vec(from: THREE.Vector3, factor?: number): c3d.Vector3D;
export function vec2vec(from: c3d.Vector3D, factor?: number): THREE.Vector3;
export function vec2vec(from: THREE.Vector3 | c3d.Vector3D, factor = 100): THREE.Vector3 | c3d.Vector3D {
    if (from instanceof c3d.Vector3D) {
        return new THREE.Vector3(from.x / factor, from.y / factor, from.z / factor);
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


export function mat2mat(mat: c3d.Matrix3D, into = new THREE.Matrix4): THREE.Matrix4 {
    const row0 = mat.GetAxisX();
    const row1 = mat.GetAxisY();
    const row2 = mat.GetAxisZ();
    const row3 = mat.GetOrigin();
    const col3 = mat.GetOffset();
    into.set(
        row0.x, row0.y, row0.z, col3.x,
        row1.x, row1.y, row1.z, col3.y,
        row2.x, row2.y, row2.z, col3.z,
        row3.x, row3.y, row3.z, 1,
    );
    return into;
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
            const location = hint.PointRelative(point);
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