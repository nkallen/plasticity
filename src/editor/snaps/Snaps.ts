import { freeze, X, Y, Z } from "../../util/Constants";
import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { curve3d2curve2d, isSamePlacement, normalizePlacement, point2point, vec2vec } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { CrossPoint } from "../curves/CrossPointDatabase";
import { AxisSnap, NormalAxisSnap, PointAxisSnap } from "./AxisSnap";
import { PlaneSnap } from "./PlaneSnap";
import { PointSnap } from "./PointSnap";
import { ChoosableSnap, RaycastableSnap, OrRestriction, Restriction, Snap, SnapProjection } from "./Snap";

export class CircleCenterPointSnap extends PointSnap {
    constructor(model: c3d.Arc3D, private readonly view: visual.CurveEdge) {
        super("Center",
            point2point(model.GetCentre()),
            vec2vec(model.GetPlaneCurve(false).placement.GetAxisZ(), 1).normalize()
        );
    }

    get helper() { return this.view.slice('line') }
}

export class CircleCurveCenterPointSnap extends PointSnap {
    constructor(model: c3d.Arc3D, readonly curveSnap: CurveSnap) {
        super("Center",
            point2point(model.GetCentre()),
            vec2vec(model.GetPlaneCurve(false).placement.GetAxisZ(), 1).normalize()
        );
    }
}

export class CircularNurbsCenterPointSnap extends PointSnap {
    constructor(center: THREE.Vector3, z: THREE.Vector3, private readonly view: visual.CurveEdge) {
        super("Center", center, z);
    }

    get helper() { return this.view.slice('line') }
}

export class CrossPointSnap extends PointSnap {
    constructor(readonly cross: CrossPoint, readonly curve1: CurveSnap, readonly curve2: CurveSnap) {
        super("Intersection", cross.position);
    }

    additionalSnapsFor(point: THREE.Vector3) {
        let result: RaycastableSnap[] = [];
        result = result.concat(this.curve1.additionalSnapsFor(point));
        result = result.concat(this.curve2.additionalSnapsFor(point));
        return result;
    }
}

export class AxisAxisCrossPointSnap extends PointSnap {
    private readonly _helper = new THREE.Group();
    get helper() { return this._helper }

    constructor(readonly cross: CrossPoint, axis1: AxisSnap, axis2: AxisSnap) {
        super("Intersection", cross.position);
        this._helper.add(axis1.helper.clone());
        this._helper.add(axis2.helper.clone());
    }
}

export class CurvePointSnap extends PointSnap {
    constructor(readonly name: string | undefined, position: THREE.Vector3, readonly curveSnap: CurveSnap, protected readonly _t: number) {
        super(name, position);
    }

    t(_: any) { return this._t }

    get view() { return this.curveSnap.view }
    get model() { return this.curveSnap.model }

    additionalSnapsFor(point: THREE.Vector3) {
        return this.curveSnap.additionalSnapsFor(point);
    }

    override restrictionFor(point: THREE.Vector3): Restriction | undefined {
        return this.curveSnap.restrictionFor(point);
    }

    override additionalSnapsGivenPreviousSnap(point: THREE.Vector3, lastPickedSnap: Snap): Snap[] {
        return this.curveSnap.additionalSnapsGivenPreviousSnap(point, lastPickedSnap);
    }
}


export class AxisCurveCrossPointSnap extends CurvePointSnap {
    constructor(readonly cross: CrossPoint, private readonly axis: AxisSnap, readonly curve: CurveSnap) {
        super("Intersection", cross.position, curve, cross.on2.t);
    }

    get helper() { return this.axis.helper }

    additionalSnapsFor(point: THREE.Vector3) {
        return this.curve.additionalSnapsFor(point);
    }
}

export class CurveEndPointSnap extends CurvePointSnap {
    get tangentSnap(): PointAxisSnap {
        const { _t, curveSnap: { model } } = this;
        const tangent = vec2vec(model.Tangent(_t), 1);
        return new PointAxisSnap("Tangent", tangent, this.position);
    }
}

export class EdgePointSnap extends PointSnap {
    constructor(name: string, position: THREE.Vector3, tangent: THREE.Vector3, readonly edgeSnap: CurveEdgeSnap) {
        super(name, position, tangent);
    }

    override get helper() { return this.edgeSnap.helper }

    override restrictionFor(point: THREE.Vector3) {
        return this.edgeSnap.restrictionFor(point);
    }
}

export class FaceCenterPointSnap extends PointSnap {
    constructor(position: THREE.Vector3, normal: THREE.Vector3, readonly faceSnap: FaceSnap) {
        super("Center", position, normal);
    }

    additionalSnapsFor(point: THREE.Vector3) {
        const normalSnap = new NormalAxisSnap(this.normal, point);
        return [normalSnap];
    }

    get normalSnap(): PointAxisSnap {
        return this.faceSnap.additionalSnapsFor(this.position)[0];
    }

    get placement() {
        return this.faceSnap.placement;
    }
}

export class CurveEdgeSnap extends Snap {
    readonly name = "Edge";

    constructor(readonly view: visual.CurveEdge, private readonly model: c3d.CurveEdge) {
        super();
    }

    override get helper() { return this.view.slice('line') }

    t(point: THREE.Vector3) {
        return this.model.PointProjection(point2point(point));
    }

    project(point: THREE.Vector3) {
        const t = this.model.PointProjection(point2point(point));
        const on = this.model.Point(t);
        const curve = this.model.GetSpaceCurve()!;
        const t2 = curve.NearPointProjection(point2point(point), false).t;
        const tan = curve.Tangent(t2);
        const position = point2point(on);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(tan, 1));
        return { position, orientation };
    }

    isValid(pt: THREE.Vector3): boolean {
        const t = this.model.PointProjection(point2point(pt));
        const on = this.model.Point(t);
        const result = pt.manhattanDistanceTo(point2point(on)) < 10e-4;
        return result;
    }

    restrictionFor(point: THREE.Vector3): Restriction | undefined {
        const planar = this.planes;
        if (planar.length === 0) return undefined;
        else if (planar.length === 1) return planar[0];
        else return new OrRestriction(planar);
    }

    get planes() {
        const facePlus = this.model.GetFacePlus();
        const faceMinus = this.model.GetFaceMinus();
        const planar = [];
        if (facePlus !== null && facePlus.IsPlanar()) {
            const { point, normal } = facePlus.GetAnyPointOn();
            planar.push(new PlaneSnap(vec2vec(normal, 1), point2point(point)));
        }
        if (faceMinus !== null && faceMinus.IsPlanar()) {
            const { point, normal } = faceMinus.GetAnyPointOn();
            planar.push(new PlaneSnap(vec2vec(normal, 1), point2point(point)));
        }
        return planar;
    }
}

const zero = new THREE.Vector3();

export class CurveSnap extends Snap {
    readonly name = "Curve";

    constructor(readonly view: visual.SpaceInstance<visual.Curve3D>, readonly model: c3d.Curve3D) {
        super();
    }

    t(point: THREE.Vector3) {
        return this.model.NearPointProjection(point2point(point), false).t;
    }

    project(point: THREE.Vector3) {
        const { t } = this.model.NearPointProjection(point2point(point), false);
        const on = this.model.PointOn(t);
        const tan = this.model.Tangent(t);
        const position = point2point(on);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(tan, 1));
        return { position, orientation };
    }

    isValid(pt: THREE.Vector3): boolean {
        const { t } = this.model.NearPointProjection(point2point(pt), false);
        const on = this.model.PointOn(t);
        const result = pt.manhattanDistanceTo(point2point(on)) < 10e-4;
        return result;
    }

    additionalSnapsFor(point: THREE.Vector3) {
        const { model } = this;
        const { t } = this.model.NearPointProjection(point2point(point), false);
        let normal = vec2vec(model.Normal(t), 1);
        let binormal = vec2vec(model.BNormal(t), 1);
        const tangent = vec2vec(model.Tangent(t), 1);

        // in the case of straight lines, there is a tangent but no normal/binormal
        if (normal.manhattanDistanceTo(zero) < 10e-6) {
            normal.copy(tangent).cross(Z);
            if (normal.manhattanDistanceTo(zero) < 10e-6)
                normal.copy(tangent).cross(Y);
            normal.normalize();
        }
        if (binormal.manhattanDistanceTo(zero) < 10e-6) {
            binormal.copy(normal).cross(tangent);
            binormal.normalize();
        }

        const normalSnap = new PointAxisSnap("Normal", normal, point);
        const binormalSnap = new PointAxisSnap("Binormal", binormal, point);
        const tangentSnap = new PointAxisSnap("Tangent", tangent, point);
        return [normalSnap, binormalSnap, tangentSnap];
    }

    override additionalSnapsGivenPreviousSnap(last: THREE.Vector3, lastPickedSnap: Snap) {
        const { model } = this;
        const planarized = curve3d2curve2d(model, new c3d.Placement3D());
        if (planarized === undefined) return [];
        const { curve, placement } = planarized;

        const point = point2point(last);
        const location = placement.PointRelative(point);
        if (location !== c3d.ItemLocation.OnItem) return [];
        placement.GetPointInto(point);
        const lastPoint2d = new c3d.CartPoint(point.x, point.y);

        const lines = c3d.CurveTangent.LinePointTangentCurve(lastPoint2d, curve, true);
        const result = [];
        for (const line of lines) {
            const { result1: intersections } = c3d.ActionPoint.CurveCurveIntersection2D(curve, line, 10e-6, 10e-6, true);
            for (const t of intersections) {
                const point2d = curve.PointOn(t);
                const lineDirection = point2point(point2d).sub(point2point(lastPoint2d)).normalize();
                const collinear = Math.abs(Math.abs(vec2vec(curve.Tangent(t), 1).dot(lineDirection)) - 1) < 10e-4;
                if (!collinear) continue;

                const point = point2point(placement.GetPointFrom(point2d.x, point2d.y, 0));
                const snap = new PointSnap("Tangent", point);
                result.push(snap);
            }
        }

        if (lastPickedSnap instanceof CurvePointSnap) lastPickedSnap = lastPickedSnap.curveSnap;

        if (lastPickedSnap instanceof CurveSnap) {
            const planarized = curve3d2curve2d(lastPickedSnap.model, placement);
            if (planarized === undefined) return result;
            const { curve: lastCurve, placement: lastPlacement } = planarized;

            if (!isSamePlacement(placement, lastPlacement)) return result;
            normalizePlacement(lastCurve, lastPlacement, new Set([placement]));

            const { pLine, secondPoint } = c3d.CurveTangent.LineTangentTwoCurves(lastCurve, curve);
            for (const [i, point2d] of secondPoint.entries()) {
                const point2 = point2point(placement.GetPointFrom(point2d.x, point2d.y, 0));

                const line = pLine[i];
                const { result2: intersections } = c3d.ActionPoint.CurveCurveIntersection2D(line, lastCurve, 10e-6, 10e-6, true);
                const t = intersections[0];
                const intersectionPoint2d = lastCurve.PointOn(t);
                const point1 = point2point(placement.GetPointFrom(intersectionPoint2d.x, intersectionPoint2d.y, 0));

                const snap = new TanTanSnap(point1, point2);
                result.push(snap);
            }
        }

        return result;
    }

    override restrictionFor(point: THREE.Vector3): Restriction | undefined {
        const { model } = this;
        const { t } = this.model.NearPointProjection(point2point(point), false);
        const tangent = vec2vec(model.Tangent(t), 1);

        return new PlaneSnap(tangent, point);
    }
}

export class TanTanSnap extends PointSnap {
    constructor(readonly point1: THREE.Vector3, readonly point2: THREE.Vector3) {
        super("Tan/Tan", point2);
    }
}

export class FaceSnap extends Snap implements ChoosableSnap {
    readonly name = "Face";

    constructor(readonly view: visual.Face, private readonly model: c3d.Face) {
        super();
    }

    private readonly mat = new THREE.Matrix4();
    project(point: THREE.Vector3) {
        const { model, mat } = this;
        const { u, v, normal: normal_c3d } = model.NearPointProjection(point2point(point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = point2point(model.Point(faceU, faceV));
        const position = projected;
        const normal = vec2vec(normal_c3d, 1);
        mat.lookAt(new THREE.Vector3(), normal, new THREE.Vector3(0, 0, 1));
        const orientation = new THREE.Quaternion().setFromRotationMatrix(mat);
        return { position, orientation };
    }

    isValid(point: THREE.Vector3): boolean {
        const { model } = this;
        const { u, v } = model.NearPointProjection(point2point(point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = point2point(model.Point(faceU, faceV));
        const result = point.manhattanDistanceTo(projected) < 10e-4;
        return result;
    }

    restrictionFor(point: THREE.Vector3) {
        const { normal } = this.model.NearPointProjection(point2point(point));
        const plane = new PlaneSnap(vec2vec(normal, 1), point);
        return plane;
    }

    additionalSnapsFor(point: THREE.Vector3) {
        const { model } = this;
        const { normal } = model.NearPointProjection(point2point(point));
        const normalSnap = new NormalAxisSnap(vec2vec(normal, 1), point);
        return [normalSnap];
    }

    private readonly n = new THREE.Vector3();
    intersect(raycaster: THREE.Raycaster, info?: { position: THREE.Vector3, orientation: THREE.Quaternion }): SnapProjection | undefined {
        if (info === undefined) return;
        const { n } = this;
        const orientation = info.orientation;
        n.set(0, 0, 1).applyQuaternion(orientation);
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, info.position);
        const position = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        if (position === null) return;
        return { position, orientation };
    }

    get placement() {
        if (!this.model.IsPlanar()) return undefined;
        const { point, normal } = this.model.GetAnyPointOn();
        return new c3d.Placement3D(point, normal, false);
    }
}
