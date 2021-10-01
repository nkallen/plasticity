import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import c3d from '../../../build/Release/c3d.node';
import { PointPicker } from "../../commands/PointPicker";
import { curve3d2curve2d, deunit, isSamePlacement, normalizePlacement, point2point, vec2vec } from "../../util/Conversion";
import * as visual from '../VisualModel';

export enum Layers {
    PointSnap,
    CurveEdgeSnap,
    CurveSnap,
    AxisSnap,
    PlaneSnap,
    ConstructionPlaneSnap,
    FaceSnap
}

export interface Restriction {
    isValid(pt: THREE.Vector3): boolean;
}

export abstract class Snap implements Restriction {
    readonly name?: string = undefined;
    abstract readonly snapper: THREE.Object3D; // the actual object to snap to, used in raycasting when snapping
    readonly nearby?: THREE.Object3D; // a slightly larger object for raycasting when showing nearby snap points
    readonly helper?: THREE.Object3D; // another indicator, like a long line for axis snaps
    priority?: number;
    protected abstract layer: Layers;

    protected init() {
        const { snapper, nearby, helper } = this;
        snapper.updateMatrixWorld();
        nearby?.updateMatrixWorld();
        helper?.updateMatrixWorld();

        snapper.userData.snap = this;
        snapper.layers.set(this.layer);
        snapper.traverse(c => {
            c.layers.set(this.layer);
            c.userData.snap = this;
        });

        if (nearby != null)
            nearby.userData.snap = this;
        nearby?.layers.set(this.layer);
        nearby?.traverse(c => {
            c.userData.snap = this;
            c.layers.set(this.layer);
        });
    }

    abstract project(intersection: THREE.Intersection): { position: THREE.Vector3; orientation: THREE.Quaternion; };
    abstract isValid(pt: THREE.Vector3): boolean;

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) { }
    additionalSnapsFor(point: THREE.Vector3): Snap[] { return [] }
    additionalSnapsForLast(point: THREE.Vector3, lastPickedSnap: Snap): Snap[] { return [] }
}

export class PointSnap extends Snap {
    readonly snapper = new THREE.Mesh(PointSnap.snapperGeometry);
    readonly nearby = new THREE.Mesh(PointSnap.nearbyGeometry);
    readonly position: THREE.Vector3;
    private static snapperGeometry = new THREE.SphereGeometry(0.1);
    private static nearbyGeometry = new THREE.SphereGeometry(0.2);
    protected layer = Layers.PointSnap;

    constructor(readonly name?: string, position = new THREE.Vector3(), private readonly normal = Z) {
        super();

        this.snapper.position.copy(position);
        this.nearby.position.copy(position);
        this.position = position.clone();
        super.init();
    }

    project(intersection: THREE.Intersection) {
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
}

export class CurvePointSnap extends PointSnap {
    constructor(readonly name: string, position: THREE.Vector3, readonly curveSnap: CurveSnap, readonly t: number) {
        super(name, position);
    }

    get view() { return this.curveSnap.view }
    get model() { return this.curveSnap.model }
}

export class FacePointSnap extends PointSnap {
    constructor(readonly name: string, position: THREE.Vector3, normal: THREE.Vector3, readonly faceSnap: FaceSnap) {
        super(name, position, normal);
    }

    get view() { return this.faceSnap.view }
    get model() { return this.faceSnap.model }

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) {
        this.faceSnap.addAdditionalRestrictionsTo(pointPicker, point);
    }
}

export class CurveEdgeSnap extends Snap {
    readonly name = "Edge";
    t!: number;
    readonly snapper = new Line2(this.view.child.geometry, this.view.child.material);
    protected readonly layer = Layers.CurveEdgeSnap;

    constructor(readonly view: visual.CurveEdge, readonly model: c3d.CurveEdge) {
        super();
        this.snapper.scale.setScalar(deunit(1));
        this.init();
    }

    project(intersection: THREE.Intersection) {
        const pt = intersection.point;
        const t = this.model.PointProjection(point2point(pt));
        const on = this.model.Point(t);
        const tan = this.model.GetSpaceCurve()!.Tangent(t);
        this.t = t;
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
}

const zero = new THREE.Vector3();

export class CurveSnap extends Snap {
    readonly name = "Curve";
    t!: number;
    readonly snapper = new THREE.Group();
    protected readonly layer = Layers.CurveSnap;

    constructor(readonly view: visual.SpaceInstance<visual.Curve3D>, readonly model: c3d.Curve3D) {
        super();
        const curve = view.underlying;
        for (const child of curve.segments.children) {
            const segment = child as visual.CurveSegment;
            this.snapper.add(segment.line.clone());
        }
        this.init();
    }

    project(intersection: THREE.Intersection) {
        const pt = intersection.point;
        const { t } = this.model.NearPointProjection(point2point(pt), false);
        const on = this.model.PointOn(t);
        const tan = this.model.Tangent(t);
        this.t = t;
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

        const normalSnap = new AxisSnap("Normal", normal, point);
        const binormalSnap = new AxisSnap("Binormal", binormal, point);
        const tangentSnap = new AxisSnap("Tangent", tangent, point);
        return [normalSnap, binormalSnap, tangentSnap];
    }

    additionalSnapsForLast(last: THREE.Vector3, lastPickedSnap: Snap) {
        const { model } = this;
        const planarized = curve3d2curve2d(model, new c3d.Placement3D());
        if (planarized === undefined) return [];
        const { curve, placement } = planarized;

        const point = point2point(last);
        const location = placement.PointRelative(point);
        if (location !== c3d.ItemLocation.OnItem) return [];
        placement.GetPointInto(point);
        const point2d = new c3d.CartPoint(point.x, point.y);

        const lines = c3d.CurveTangent.LinePointTangentCurve(point2d, curve, true);
        const result = [];
        for (const line of lines) {
            const { result1: intersections } = c3d.ActionPoint.CurveCurveIntersection2D(curve, line, 10e-6, 10e-6, true);
            for (const t of intersections) {
                const point2d = curve.PointOn(t);
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

export class FaceSnap extends Snap {
    readonly name = "Face";
    readonly snapper = this.view.child.clone();
    protected readonly layer = Layers.FaceSnap;

    constructor(readonly view: visual.Face, readonly model: c3d.Face) {
        super();
        this.init();
    }

    project(intersection: THREE.Intersection) {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(point2point(intersection.point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = point2point(model.Point(faceU, faceV));
        const position = projected;
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(normal, 1));
        return { position, orientation };
    }

    isValid(point: THREE.Vector3): boolean {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(point2point(point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = point2point(model.Point(faceU, faceV));
        const result = point.manhattanDistanceTo(projected) < 10e-4;
        return result;
    }

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) {
        const { normal } = this.model.NearPointProjection(point2point(point));
        const plane = new PlaneSnap(vec2vec(normal, 1), point);
        pointPicker.restrictToPlane(plane);
    }

    additionalSnapsFor(point: THREE.Vector3) {
        const { model } = this;
        const { normal } = model.NearPointProjection(point2point(point));
        const normalSnap = new AxisSnap("Normal", vec2vec(normal, 1), point);
        return [normalSnap];
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
}
const axisGeometry = new THREE.BufferGeometry();
const points = [];
points.push(new THREE.Vector3(0, -100000, 0));
points.push(new THREE.Vector3(0, 100000, 0));
axisGeometry.setFromPoints(points);
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class AxisSnap extends Snap {
    readonly snapper = new THREE.Line(axisGeometry, new THREE.LineBasicMaterial());
    readonly helper = this.snapper;

    static X = new AxisSnap("X", new THREE.Vector3(1, 0, 0));
    static Y = new AxisSnap("Y", new THREE.Vector3(0, 1, 0));
    static Z = new AxisSnap("Z", new THREE.Vector3(0, 0, 1));

    readonly n = new THREE.Vector3();
    readonly o = new THREE.Vector3();

    protected readonly layer = Layers.AxisSnap;

    constructor(readonly name: string | undefined, n: THREE.Vector3, o = new THREE.Vector3()) {
        super();
        this.snapper.position.copy(o);
        this.snapper.quaternion.setFromUnitVectors(Y, n);

        this.n.copy(n).normalize();
        this.o.copy(o);

        this.init();
    }

    private readonly projection = new THREE.Vector3();
    private readonly intersectionPoint = new THREE.Vector3();
    project(intersection: THREE.Intersection) {
        const { n, o } = this;
        const { projection, intersectionPoint } = this;
        const position = projection.copy(n).multiplyScalar(n.dot(intersectionPoint.copy(intersection.point).sub(o))).add(o);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, n);
        return { position, orientation };
    }

    protected readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return this.valid.copy(pt).sub(o).cross(n).lengthSq() < 10e-6;
    }

    move(o: THREE.Vector3) {
        const { n } = this;
        return new AxisSnap(this.name?.toLowerCase(), this.n, o.clone().add(this.o));
    }

    rotate(quat: THREE.Quaternion) {
        const { n, o } = this;
        return new AxisSnap(this.name?.toLowerCase(), this.n.clone().applyQuaternion(quat), o);
    }
}
// A line snap looks like an axis snap (it has a Line helper) but valid click targets are actually
// any where other than the line's origin. It's used mainly for extruding, where you want to limit
// the direction of extrusion but allow the user to move the mouse wherever.

export class LineSnap extends Snap {
    readonly snapper = new THREE.Group().add(this.plane1.snapper, this.plane2.snapper);
    readonly helper = this.axis.helper;
    protected readonly layer: Layers = Layers.AxisSnap;

    static make(name: string | undefined, direction: THREE.Vector3, origin: THREE.Vector3) {
        const p = new THREE.Vector3(1, 0, 0);
        p.cross(direction);
        if (p.lengthSq() < 10e-5) {
            const p = new THREE.Vector3(0, 1, 0);
            p.cross(direction);
        }

        const axis = new AxisSnap(name, direction, origin);
        const plane1 = new PlaneSnap(p, origin);

        const p2 = new THREE.Vector3().copy(p).cross(direction);
        const plane2 = new PlaneSnap(p2, origin);

        return new LineSnap(name, axis, plane1, plane2);
    }

    private constructor(readonly name: string | undefined, private readonly axis: AxisSnap, private readonly plane1: PlaneSnap, private readonly plane2: PlaneSnap) {
        super();
    }

    project(intersection: THREE.Intersection) {
        return this.axis.project(intersection);
    }

    isValid(pt: THREE.Vector3): boolean {
        return this.plane1.isValid(pt) || this.plane2.isValid(pt);
    }
}
const planeGeo = new THREE.PlaneGeometry(10000, 10000, 2, 2);
const mat = new THREE.MeshBasicMaterial();
mat.side = THREE.DoubleSide;

export class PlaneSnap extends Snap {
    readonly snapper = new THREE.Mesh(planeGeo, mat);
    protected readonly layer: Layers = Layers.PlaneSnap;

    static X = new PlaneSnap(new THREE.Vector3(1, 0, 0));
    static Y = new PlaneSnap(new THREE.Vector3(0, 1, 0));
    static Z = new PlaneSnap(new THREE.Vector3(0, 0, 1));

    readonly n: THREE.Vector3;
    readonly p: THREE.Vector3;

    constructor(n: THREE.Vector3 = new THREE.Vector3(0, 0, 1), p: THREE.Vector3 = new THREE.Vector3()) {
        super();

        n = n.clone();
        p = p.clone();
        this.snapper.lookAt(n);
        this.snapper.position.copy(p);
        this.n = n;
        this.p = p;

        this.init();
    }

    project(intersection: THREE.Intersection) {
        const { n, p } = this;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
        const position = plane.projectPoint(intersection.point, new THREE.Vector3());
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, n);
        return { position, orientation };
    }

    move(pt: THREE.Vector3): PlaneSnap {
        return new PlaneSnap(this.n, pt);
    }

    private readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, p } = this;
        return Math.abs(pt.clone().sub(p).dot(n)) < 10e-4;
    }

    update(camera: THREE.Camera) { }

    get placement() {
        return new c3d.Placement3D(point2point(this.p), vec2vec(this.n, 1), false);
    }
}
// The main purpose of this class is to have a lower priority in raycasting than other, explicitly added snaps.

export class ConstructionPlaneSnap extends PlaneSnap {
    protected readonly layer = Layers.ConstructionPlaneSnap;

    move(pt: THREE.Vector3): PlaneSnap {
        return new ConstructionPlaneSnap(this.n, pt);
    }
}

export class CameraPlaneSnap extends PlaneSnap {
    private readonly worldDirection: THREE.Vector3;
    private readonly projectionPoint: THREE.Vector3;

    constructor(camera: THREE.Camera) {
        super(new THREE.Vector3(), new THREE.Vector3());
        this.worldDirection = new THREE.Vector3();
        this.projectionPoint = new THREE.Vector3();
        this.update(camera);
    }

    isValid(pt: THREE.Vector3): boolean {
        const { worldDirection } = this;

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldDirection, this.snapper.position);

        return Math.abs(plane.distanceToPoint(pt)) < 1e-4;
    }

    project(intersection: THREE.Intersection) {
        const { worldDirection, projectionPoint } = this;

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldDirection, this.snapper.position);

        const position = plane.projectPoint(intersection.point, projectionPoint);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, worldDirection);
        return { position, orientation };
    }

    update(camera: THREE.Camera) {
        if (!(camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera))
            throw Error("invalid precondition");

        const { worldDirection } = this;
        camera.getWorldDirection(worldDirection);

        this.snapper.position.copy(camera.position).add(worldDirection.clone().multiplyScalar(15));
        this.snapper.lookAt(worldDirection);
        this.snapper.updateMatrixWorld();
    }
}
