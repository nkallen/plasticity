import c3d from '../../build/Release/c3d.node';
import * as THREE from "three";

export function cart2vec(from: c3d.CartPoint3D): THREE.Vector3 {
    return new THREE.Vector3(from.x, from.y, from.z);
}

export function vec2cart(from: THREE.Vector3): c3d.CartPoint3D {
    return new c3d.CartPoint3D(from.x, from.y, from.z);
}

export function vec2vec(from: c3d.Vector3D): THREE.Vector3 {
    return new THREE.Vector3(from.x, from.y, from.z);
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
        if (!(curve3d instanceof c3d.PolyCurve3D)) throw new Error("invalid precondition");
        const points2d = [];
        for (const point of curve3d.GetPoints()) {
            if (hint.PointRelative(point) !== c3d.ItemLocation.OnItem) return;
            const { x, y } = hint.PointProjection(point);
            points2d.push(new c3d.CartPoint(x, y));
        }
        const curve2d = c3d.ActionCurve.SplineCurve(points2d, false, c3d.PlaneType.Polyline);
        return { curve: curve2d, placement: hint };
    } else if (curve3d.IsPlanar()) {
        const { curve2d, placement } = curve3d.GetPlaneCurve(false, new c3d.PlanarCheckParams(0.01));

        return { curve: curve2d, placement };
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

    // To objects can be coplanar but have different placements (e.g., different origins, same Z axis);
    // Thus it's safest to normalize or else future operations like booleans may not work.
    const matrix = placement.GetMatrixToPlace(bestExistingPlacement);
    curve2d.Transform(matrix);

    return bestExistingPlacement;
}

export function isSamePlacement(placement1: c3d.Placement3D, placement2: c3d.Placement3D): boolean {
    const Z = placement1.GetAxisZ();
    const origin = cart2vec(placement2.GetOrigin());
    const delta = cart2vec(placement1.GetOrigin()).sub(origin);
    const ZdotOffset = Math.abs(vec2vec(Z).dot(delta));

    return Z.Colinear(placement2.GetAxisZ()) && ZdotOffset < 10e-4;
}