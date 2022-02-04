import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import c3d from '../../../build/Release/c3d.node';
import { curve3d2curve2d, isSamePlacement, normalizePlacement, point2point, vec2vec } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { CrossPoint } from "../curves/CrossPointDatabase";

export interface Restriction {
    isValid(pt: THREE.Vector3): boolean;
    project(point: THREE.Vector3): SnapProjection;
}

export abstract class Snap implements Restriction {
    readonly name?: string = undefined;
    abstract readonly snapper: THREE.Object3D; // the actual object to snap to, used in raycasting when snapping
    readonly nearby?: THREE.Object3D; // a slightly larger object for raycasting when showing nearby snap points
    readonly helper?: THREE.Object3D; // another indicator, like a long line for axis snaps

    protected init() {
        const { snapper, nearby, helper } = this;
        if (snapper === helper) throw new Error("Snapper should not === helper because snappers have userData and helpers should be simple cloneable objects");

        snapper.updateMatrixWorld();
        nearby?.updateMatrixWorld();
        helper?.updateMatrixWorld();

        snapper.userData.snap = this;
        snapper.traverse(c => {
            c.userData.snap = this;
        });

        if (nearby != null) nearby.userData.snap = this;
        nearby?.traverse(c => {
            c.userData.snap = this;
        });
    }

    abstract project(point: THREE.Vector3): SnapProjection;
    abstract isValid(pt: THREE.Vector3): boolean;

    restrictionFor(point: THREE.Vector3): Restriction | undefined { return }
    additionalSnapsFor(point: THREE.Vector3): Snap[] { return [] }
    additionalSnapsGivenPreviousSnap(point: THREE.Vector3, lastPickedSnap: Snap): Snap[] { return [] }
}

export interface ChoosableSnap extends Snap {
    intersect(raycaster: THREE.Raycaster, info?: { position: THREE.Vector3, orientation: THREE.Quaternion }): SnapProjection | undefined;
}

export class PointSnap extends Snap {
    readonly snapper = new THREE.Mesh(PointSnap.snapperGeometry);
    readonly nearby = new THREE.Mesh(PointSnap.nearbyGeometry);
    readonly position: THREE.Vector3;
    static snapperGeometry = new THREE.SphereGeometry(0.1);
    static nearbyGeometry = new THREE.SphereGeometry(0.2);

    constructor(readonly name?: string, position = new THREE.Vector3(), protected readonly normal = Z) {
        super();

        this.snapper.position.copy(position);
        this.nearby.position.copy(position);
        this.position = position.clone();
        super.init();
    }

    project(point: THREE.Vector3) {
        const position = this.position;
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, this.normal);
        return { position, orientation };
    }

    axes(axisSnaps: Iterable<AxisSnap>) {
        const o = this.position.clone();
        const result = [];
        for (const snap of axisSnaps) {
            result.push(snap.move(o));
        }

        return result;
    }

    isValid(pt: THREE.Vector3): boolean {
        return this.snapper.position.manhattanDistanceTo(pt) < 10e-6;
    }

    restrictionFor(point: THREE.Vector3): Restriction | undefined {
        return new PlaneSnap(this.normal, this.position);
    }
}

export class CircleCenterPointSnap extends PointSnap {
    readonly helper = new THREE.Group();

    constructor(model: c3d.Arc3D, view: visual.CurveEdge) {
        super("Center",
            point2point(model.GetCentre()),
            vec2vec(model.GetPlaneCurve(false).placement.GetAxisZ(), 1).normalize()
        );

        const slice = view.slice('line');
        this.helper.add(slice);
    }
}

export class CircleCurveCenterPointSnap extends PointSnap {
    readonly helper = new THREE.Group();

    constructor(model: c3d.Arc3D, readonly curveSnap: CurveSnap) {
        super("Center",
            point2point(model.GetCentre()),
            vec2vec(model.GetPlaneCurve(false).placement.GetAxisZ(), 1).normalize()
        );
    }
}

export class CircularNurbsCenterPointSnap extends PointSnap {
    readonly helper = new THREE.Group();

    constructor(center: THREE.Vector3, z: THREE.Vector3, view: visual.CurveEdge) {
        super("Center", center, z);

        const slice = view.slice('line');
        this.helper.add(slice);
    }
}

export class CrossPointSnap extends PointSnap {
    constructor(readonly cross: CrossPoint, readonly curve1: CurveSnap, readonly curve2: CurveSnap) {
        super("Intersection", cross.position);
    }

    additionalSnapsFor(point: THREE.Vector3) {
        let result: Snap[] = [];
        result = result.concat(this.curve1.additionalSnapsFor(point));
        result = result.concat(this.curve2.additionalSnapsFor(point));
        return result;
    }
}

export class AxisAxisCrossPointSnap extends PointSnap {
    readonly helper = new THREE.Group();

    constructor(readonly cross: CrossPoint, axis1: AxisSnap, axis2: AxisSnap) {
        super("Intersection", cross.position);
        this.helper.add(axis1.helper.clone());
        this.helper.add(axis2.helper.clone());
    }
}

export class AxisCurveCrossPointSnap extends PointSnap {
    readonly helper = new THREE.Group();

    constructor(readonly cross: CrossPoint, axis: AxisSnap, readonly curve: CurveSnap) {
        super("Intersection", cross.position);
        this.helper.add(axis.helper.clone());
    }

    additionalSnapsFor(point: THREE.Vector3) {
        return this.curve.additionalSnapsFor(point);
    }
}

export class CurvePointSnap extends PointSnap {
    constructor(readonly name: string | undefined, position: THREE.Vector3, readonly curveSnap: CurveSnap, protected readonly _t: number) {
        super(name, position);
    }

    t(_: any) { return this._t }

    get view() { return this.curveSnap.view }
    get model() { return this.curveSnap.model }

    additionalSnapsFor(point: THREE.Vector3): Snap[] {
        return this.curveSnap.additionalSnapsFor(point);
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
    readonly helper?: THREE.Object3D;

    constructor(name: string, position: THREE.Vector3, tangent: THREE.Vector3, readonly edgeSnap: CurveEdgeSnap) {
        super(name, position, tangent);
        this.helper = edgeSnap.helper;
    }

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
}

export class CurveEdgeSnap extends Snap {
    readonly name = "Edge";
    readonly snapper: THREE.Object3D;
    readonly helper = new THREE.Group();

    constructor(readonly view: visual.CurveEdge, readonly model: c3d.CurveEdge) {
        super();
        this.snapper = view.slice();
        const slice = view.slice('line');
        this.helper.add(slice);
        this.init();
    }

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
        if (planar.length === 0) return undefined;
        else if (planar.length === 1) return planar[0];
        else return new OrRestriction(planar);
    }
}

const zero = new THREE.Vector3();

export class CurveSnap extends Snap {
    readonly name = "Curve";
    readonly snapper = new THREE.Group();

    constructor(readonly view: visual.SpaceInstance<visual.Curve3D>, readonly model: c3d.Curve3D) {
        super();
        // this.snapper.add(view.picker);
        this.init();
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

    additionalSnapsGivenPreviousSnap(last: THREE.Vector3, lastPickedSnap: Snap) {
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
}

export class TanTanSnap extends PointSnap {
    constructor(readonly point1: THREE.Vector3, readonly point2: THREE.Vector3) {
        super("Tan/Tan", point2);
    }
}

type SnapProjection = {
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
};

export class FaceSnap extends Snap implements ChoosableSnap {
    readonly name = "Face";
    readonly snapper = new THREE.Object3D(); // FIXME: FaceSnap and other geometry doesn't actually have a snapper ... disentangle interfaces

    constructor(readonly view: visual.Face, readonly model: c3d.Face) {
        super();
        this.init();
    }

    project(point: THREE.Vector3) {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(point2point(point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = point2point(model.Point(faceU, faceV));
        const position = projected;
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(normal, 1));
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
}

export class OrRestriction<R extends Restriction> implements Restriction {
    match!: R;
    constructor(private readonly underlying: R[]) { }

    isValid(pt: THREE.Vector3): boolean {
        for (const restriction of this.underlying) {
            if (restriction.isValid(pt)) {
                this.match = restriction;
                return true;
            }
        }
        return false;
    }

    project(point: THREE.Vector3): { position: THREE.Vector3; orientation: THREE.Quaternion } {
        return this.match.project(point);
    }
}

const axisGeometry_line = new THREE.BufferGeometry();
const points = [];
points.push(new THREE.Vector3(0, -100_000, 0));
points.push(new THREE.Vector3(0, 100_000, 0));
axisGeometry_line.setFromPoints(points);

const axisGeometry_line2 = new LineGeometry();
axisGeometry_line2.setPositions([0, -100_000, 0, 0, 100_000, 0]);

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
const origin = new THREE.Vector3();
const lineBasicMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.8 });
export const axisSnapMaterial = new LineMaterial();

export class AxisSnap extends Snap implements ChoosableSnap {
    readonly snapper = new Line2(axisGeometry_line2, axisSnapMaterial);
    readonly helper: THREE.Object3D = new THREE.Line(axisGeometry_line, lineBasicMaterial);

    static X = new AxisSnap("X", new THREE.Vector3(1, 0, 0));
    static Y = new AxisSnap("Y", new THREE.Vector3(0, 1, 0));
    static Z = new AxisSnap("Z", new THREE.Vector3(0, 0, 1));

    readonly n = new THREE.Vector3();
    readonly o = new THREE.Vector3();
    readonly orientation = new THREE.Quaternion();

    constructor(readonly name: string | undefined, n: THREE.Vector3, o = new THREE.Vector3()) {
        super();
        this.snapper.position.copy(o);
        this.snapper.quaternion.setFromUnitVectors(Y, n);
        this.helper.position.copy(this.snapper.position);
        this.helper.quaternion.copy(this.snapper.quaternion);

        this.n.copy(n).normalize();
        this.o.copy(o);
        this.orientation.setFromUnitVectors(Z, n)

        if (this.constructor === AxisSnap) this.init();
    }

    private readonly projection = new THREE.Vector3();
    private readonly intersectionPoint = new THREE.Vector3();
    project(point: THREE.Vector3) {
        const { n, o, orientation } = this;
        const { projection, intersectionPoint } = this;
        const position = projection.copy(n).multiplyScalar(n.dot(intersectionPoint.copy(point).sub(o))).add(o).clone();
        return { position, orientation };
    }

    protected readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return this.valid.copy(pt).sub(o).cross(n).lengthSq() < 10e-6;
    }

    move(delta: THREE.Vector3) {
        const { n } = this;
        return new PointAxisSnap(this.name!.toLowerCase(), this.n, this.o.clone().add(delta));
    }

    rotate(quat: THREE.Quaternion) {
        const { n, o } = this;
        return new AxisSnap(this.name?.toLowerCase(), this.n.clone().applyQuaternion(quat), o);
    }

    private readonly plane = new THREE.Mesh(planeGeometry, new THREE.MeshBasicMaterial({ color: 0x11111, side: THREE.DoubleSide }));
    private readonly eye = new THREE.Vector3();
    private readonly dir = new THREE.Vector3();
    private readonly align = new THREE.Vector3();
    private readonly matrix = new THREE.Matrix4();
    private readonly intersection = new THREE.Vector3();
    intersect(raycaster: THREE.Raycaster, info?: { position: THREE.Vector3, orientation: THREE.Quaternion }): SnapProjection | undefined {
        const { eye, plane, align, dir, o, n, matrix, intersection } = this;

        eye.copy(raycaster.camera.position).sub(o).normalize();

        align.copy(eye).cross(n);
        dir.copy(n).cross(align);

        matrix.lookAt(origin, dir, align);
        plane.quaternion.setFromRotationMatrix(matrix);
        plane.position.copy(o);
        plane.updateMatrixWorld();

        const intersections = raycaster.intersectObject(plane);
        if (intersections.length === 0) return;

        const dist = intersections[0].point.sub(o).dot(n);
        const position = intersection.copy(n).multiplyScalar(dist).add(o);
        return { position, orientation: this.orientation };
    }
}

const dotGeometry = new THREE.BufferGeometry();
dotGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
const dotMaterial = new THREE.PointsMaterial({ size: 5, sizeAttenuation: false });

export class PointAxisSnap extends AxisSnap {
    readonly helper = new THREE.Group();

    constructor(readonly name: string, n: THREE.Vector3, position: THREE.Vector3) {
        super(name, n, position);
        this.helper.add(this.snapper.clone());
        const sourcePointIndicator = new THREE.Points(dotGeometry, dotMaterial);
        sourcePointIndicator.position.copy(position);
        this.helper.add(sourcePointIndicator);
        this.init();
    }

    get commandName(): string {
        return `snaps:set-${this.name.toLowerCase()}`;
    }
}

export class NormalAxisSnap extends PointAxisSnap {
    constructor(n: THREE.Vector3, o: THREE.Vector3) {
        super("Normal", n, o);
    }
}

const mat = new THREE.MeshBasicMaterial();
mat.side = THREE.DoubleSide;

export class PlaneSnap extends Snap {
    static geometry = new THREE.PlaneGeometry(10000, 10000, 2, 2);

    readonly snapper: THREE.Object3D = new THREE.Mesh(PlaneSnap.geometry, mat);

    static X = new PlaneSnap(new THREE.Vector3(1, 0, 0));
    static Y = new PlaneSnap(new THREE.Vector3(0, 1, 0));
    static Z = new PlaneSnap(new THREE.Vector3(0, 0, 1));

    readonly n: THREE.Vector3;
    readonly p: THREE.Vector3;
    readonly orientation = new THREE.Quaternion();

    static from(origin: THREE.Vector3, quaternion: THREE.Quaternion) {
        const n = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);
        return new PlaneSnap(n, origin);
    }

    constructor(n: THREE.Vector3 = new THREE.Vector3(0, 0, 1), p: THREE.Vector3 = new THREE.Vector3(), readonly name?: string) {
        super();

        n = n.clone();
        p = p.clone();
        this.snapper.lookAt(n);
        this.snapper.position.copy(p);
        this.n = n;
        this.p = p;
        this.orientation.setFromUnitVectors(Z, this.n);

        this.init();
    }

    project(intersection: THREE.Vector3 | THREE.Intersection) {
        const point = intersection instanceof THREE.Vector3 ? intersection : intersection.point;
        const { n, p, orientation } = this;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
        const position = plane.projectPoint(point, new THREE.Vector3());
        return { position, orientation };
    }

    move(pt: THREE.Vector3): PlaneSnap {
        return new PlaneSnap(this.n, pt);
    }

    private readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, p } = this;
        return Math.abs(this.valid.copy(pt).sub(p).dot(n)) < 10e-4;
    }

    get placement() {
        return new c3d.Placement3D(point2point(this.p), vec2vec(this.n, 1), false);
    }

    get isTemp() { return true }
}

