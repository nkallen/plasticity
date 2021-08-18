import { PointPicker } from "../commands/PointPicker";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import c3d from '../../build/Release/c3d.node';
import { cart2vec, vec2cart, vec2vec } from "../util/Conversion";
import { Redisposable, RefCounter } from "../util/Util";
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { SnapMemento } from "./History";
import { SpriteDatabase } from "./SpriteDatabase";
import * as visual from './VisualModel';

export enum Layers {
    PointSnap,
    CurveEdgeSnap,
    CurveSnap,
    AxisSnap,
    PlaneSnap,
    ConstructionPlaneSnap,
    FaceSnap
}

export class SnapManager {
    private readonly basicSnaps = new Set<Snap>();

    private readonly begPoints = new Set<PointSnap>();
    private readonly midPoints = new Set<PointSnap>();
    private readonly endPoints = new Set<PointSnap>();
    private readonly faces = new Set<FaceSnap>();
    private readonly edges = new Set<CurveEdgeSnap>();
    private readonly curves = new Set<CurveSnap>();
    private readonly garbageDisposal = new RefCounter<c3d.SimpleName>();

    private nearbys: THREE.Object3D[] = []; // visual objects indicating nearby snap points
    private snappers: THREE.Object3D[] = []; // actual snap points

    readonly layers = new THREE.Layers();

    constructor(
        private readonly db: GeometryDatabase,
        private readonly sprites: SpriteDatabase,
        signals: EditorSignals
    ) {
        this.basicSnaps.add(originSnap);
        this.basicSnaps.add(new AxisSnap(new THREE.Vector3(1, 0, 0)));
        this.basicSnaps.add(new AxisSnap(new THREE.Vector3(0, 1, 0)));
        this.basicSnaps.add(new AxisSnap(new THREE.Vector3(0, 0, 1)));
        Object.freeze(this.basicSnaps);

        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.add(item);
        });
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.delete(item);
        });

        this.layers.enableAll();

        this.update();
    }

    // FIXME move into the model of PointPicker?
    nearby(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): THREE.Object3D[] {
        const additionalNearbys = [];
        for (const a of additional) if (a.nearby !== undefined) additionalNearbys.push(a.nearby);

        raycaster.layers = this.layers;
        const intersections = raycaster.intersectObjects([...this.nearbys, ...additionalNearbys]);
        const result = [];
        for (const intersection of intersections) {
            if (!this.satisfiesRestrictions(intersection.object.position, restrictions)) continue;

            const sprite = this.hoverIndicatorFor(intersection);
            result.push(sprite);
        }
        return result;
    }

    snap(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): [Snap, THREE.Vector3][] {
        const snappers = [...this.snappers, ...additional.map(a => a.snapper)];

        raycaster.layers = this.layers;
        const snapperIntersections = raycaster.intersectObjects(snappers);
        snapperIntersections.sort(sortIntersections);
        const result: [Snap, THREE.Vector3][] = [];

        for (const intersection of snapperIntersections) {
            const [snap, point] = this.helperFor(intersection);
            if (!this.satisfiesRestrictions(point, restrictions)) continue;
            result.push([snap, point]);
        }
        return result;
    }

    private satisfiesRestrictions(point: THREE.Vector3, restrictions: Restriction[]): boolean {
        for (const restriction of restrictions) {
            if (!restriction.isValid(point)) return false;
        }
        return true;
    }

    private update() {
        const all = [...this.basicSnaps, ...this.begPoints, ...this.midPoints, ...this.endPoints, ...this.faces, ...this.edges, ...this.curves];
        for (const a of all) {
            a.snapper.userData.snapper = a;
            if (a.nearby !== undefined) a.nearby.userData.snapper = a;
        }
        this.nearbys = all.map((s) => s.nearby).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
    }

    private add(item: visual.Item): void {
        const fns: Redisposable[] = [];
        if (item instanceof visual.Solid) {
            for (const edge of item.edges) {
                const d = this.addEdge(edge);
                fns.push(d);
            }
            for (const face of item.faces) {
                const d = this.addFace(face);
                fns.push(d);
            }
        } else if (item instanceof visual.SpaceInstance) {
            const d = this.addCurve(item);
            fns.push(d);
        }

        this.garbageDisposal.incr(item.simpleName, new Redisposable(() => {
            for (const fn of fns) fn.dispose()
        }));
        this.update();
    }

    private addFace(face: visual.Face): Redisposable {
        const model = this.db.lookupTopologyItem(face);

        const faceSnap = new FaceSnap(face, model);
        this.faces.add(faceSnap);

        return new Redisposable(() => {
            this.faces.delete(faceSnap);
        });
    }

    private addEdge(edge: visual.CurveEdge): Redisposable {
        const model = this.db.lookupTopologyItem(edge);
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new PointSnap(cart2vec(begPt));
        const midSnap = new PointSnap(cart2vec(midPt));

        const edgeSnap = new CurveEdgeSnap(edge, model);
        this.edges.add(edgeSnap);

        this.begPoints.add(begSnap);
        this.midPoints.add(midSnap);
        return new Redisposable(() => {
            this.begPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
            this.edges.delete(edgeSnap);
        });
    }

    private addCurve(item: visual.SpaceInstance<visual.Curve3D>): Redisposable {
        const inst = this.db.lookup(item);
        const item_ = inst.GetSpaceItem();
        if (item_ === null) throw new Error("invalid precondition");
        const curve = item_.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const min = curve.PointOn(curve.GetTMin());
        const mid = curve.PointOn(0.5 * (curve.GetTMin() + curve.GetTMax()));
        const max = curve.PointOn(curve.GetTMax());
        const begSnap = new PointSnap(cart2vec(min));
        const midSnap = new PointSnap(cart2vec(mid));
        const endSnap = new PointSnap(cart2vec(max));
        this.begPoints.add(begSnap);
        this.midPoints.add(midSnap);
        this.endPoints.add(endSnap);

        const curveSnap = new CurveSnap(item, curve);
        this.curves.add(curveSnap);

        return new Redisposable(() => {
            this.begPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
            this.endPoints.delete(endSnap);
            this.curves.delete(curveSnap);
        });
    }

    private delete(item: visual.Item): void {
        this.garbageDisposal.delete(item.simpleName);
        this.update();
    }

    private hoverIndicatorFor(intersection: THREE.Intersection): THREE.Object3D {
        const sprite = this.sprites.isNear();
        const snap = intersection.object.userData.snap;
        sprite.position.copy(snap.project(intersection));
        return sprite;
    }

    private helperFor(intersection: THREE.Intersection): [Snap, THREE.Vector3] {
        const snap = intersection.object.userData.snap;
        return [snap, snap.project(intersection)];
    }

    saveToMemento(registry: Map<any, any>): SnapMemento {
        return new SnapMemento(
            new RefCounter(this.garbageDisposal),
            new Set(this.faces),
            new Set(this.edges),
            new Set(this.curves),
            new Set(this.begPoints),
            new Set(this.midPoints),
            new Set(this.endPoints));
    }

    restoreFromMemento(m: SnapMemento) {
        (this.faces as SnapManager['faces']) = m.faces;
        (this.edges as SnapManager['edges']) = m.edges;
        (this.curves as SnapManager['curves']) = m.curves;
        (this.begPoints as SnapManager['begPoints']) = m.begPoints;
        (this.midPoints as SnapManager['midPoints']) = m.midPoints;
        (this.endPoints as SnapManager['endPoints']) = m.endPoints;
        this.update();
    }
}

export interface Restriction {
    isValid(pt: THREE.Vector3): boolean;
}

export abstract class Snap implements Restriction {
    abstract readonly snapper: THREE.Object3D; // the actual object to snap to, used in raycasting when snapping
    readonly nearby?: THREE.Object3D; // a slightly larger object for raycasting when showing nearby snap points
    readonly helper?: THREE.Object3D; // another indicator, like a long line for axis snaps
    protected readonly priority?: number;
    protected abstract layer: Layers;

    protected init() {
        const { snapper, nearby, helper } = this;
        snapper.userData.snap = this;
        if (nearby != null) nearby.userData.snap = this;
        snapper.updateMatrixWorld();
        nearby?.updateMatrixWorld();
        helper?.updateMatrixWorld();

        snapper.layers.set(this.layer);
        nearby?.layers.set(this.layer);
    }

    abstract project(intersection: THREE.Intersection): THREE.Vector3;
    abstract isValid(pt: THREE.Vector3): boolean;

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) { }
    addAdditionalSnapsTo(pointPicker: PointPicker, point: THREE.Vector3) { }
}

export class PointSnap extends Snap {
    readonly snapper = new THREE.Mesh(PointSnap.snapperGeometry);
    readonly nearby = new THREE.Mesh(PointSnap.nearbyGeometry);
    private readonly projection: THREE.Vector3;
    private static snapperGeometry = new THREE.SphereGeometry(0.1);
    private static nearbyGeometry = new THREE.SphereGeometry(0.2);
    protected layer = Layers.PointSnap;

    constructor(position = new THREE.Vector3()) {
        super();

        this.snapper.position.copy(position);
        this.nearby.position.copy(position);
        this.projection = position.clone();
        super.init();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return this.projection;
    }

    axes(axisSnaps: Iterable<AxisSnap>) {
        const o = this.projection.clone();
        const result = [];
        for (const snap of axisSnaps) {
            result.push(snap.move(o));
        }

        return result;
    }

    isValid(pt: THREE.Vector3): boolean {
        return this.snapper.position.distanceToSquared(pt) < 10e-6
    }
}

export class CurveEdgeSnap extends Snap {
    t!: number;
    readonly snapper = new Line2(this.view.child.geometry, this.view.child.material);
    protected readonly layer = Layers.CurveEdgeSnap;

    constructor(readonly view: visual.CurveEdge, readonly model: c3d.CurveEdge) {
        super();
        this.init();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const pt = intersection.point;
        const t = this.model.PointProjection(vec2cart(pt));
        const on = this.model.Point(t);
        this.t = t;
        return new THREE.Vector3(on.x, on.y, on.z);
    }

    isValid(pt: THREE.Vector3): boolean {
        const t = this.model.PointProjection(vec2cart(pt));
        const on = this.model.Point(t);
        const result = pt.distanceToSquared(new THREE.Vector3(on.x, on.y, on.z)) < 10e-4;
        return result;
    }
}

export class CurveSnap extends Snap {
    t!: number;
    readonly snapper = new Line2(this.view.underlying.line.geometry, this.view.underlying.line.material);
    protected readonly layer = Layers.CurveSnap;

    constructor(readonly view: visual.SpaceInstance<visual.Curve3D>, readonly model: c3d.Curve3D) {
        super();
        this.init();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const pt = intersection.point;
        const { t } = this.model.NearPointProjection(vec2cart(pt), false);
        const on = this.model.PointOn(t);
        this.t = t;
        return new THREE.Vector3(on.x, on.y, on.z);
    }

    isValid(pt: THREE.Vector3): boolean {
        const { t } = this.model.NearPointProjection(vec2cart(pt), false);
        const on = this.model.PointOn(t);
        const result = pt.distanceToSquared(new THREE.Vector3(on.x, on.y, on.z)) < 10e-4;
        return result;
    }

    addAdditionalSnapsTo(pointPicker: PointPicker, point: THREE.Vector3) {
        const { model } = this;
        const { t } = this.model.NearPointProjection(vec2cart(point), false);
        const normal = model.Normal(t);
        const tangent = model.Tangent(t);
        const binormal = model.BNormal(t);

        const normalSnap = new AxisSnap(vec2vec(normal), point);
        const tangentSnap = new AxisSnap(vec2vec(tangent), point);
        const binormalSnap = new AxisSnap(vec2vec(binormal), point);
        pointPicker.addSnap(normalSnap, tangentSnap, binormalSnap);
    }
}

export class FaceSnap extends Snap {
    readonly snapper = new THREE.Mesh(this.view.child.geometry);
    protected readonly layer = Layers.FaceSnap;

    constructor(readonly view: visual.Face, readonly model: c3d.Face) {
        super();
        this.init();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(vec2cart(intersection.point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = cart2vec(model.Point(faceU, faceV));
        return new THREE.Vector3(projected.x, projected.y, projected.z);
    }

    isValid(point: THREE.Vector3): boolean {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(vec2cart(point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = cart2vec(model.Point(faceU, faceV));
        const result = point.distanceToSquared(new THREE.Vector3(projected.x, projected.y, projected.z)) < 10e-4;
        return result;
    }

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) {
        const { normal } = this.model.NearPointProjection(vec2cart(point));
        const plane = new PlaneSnap(vec2vec(normal), point);
        pointPicker.restrictToPlane(plane);
    }

    addAdditionalSnapsTo(pointPicker: PointPicker, point: THREE.Vector3) {
        const { model } = this;
        const { normal } = model.NearPointProjection(vec2cart(point));
        pointPicker.addAxesAt(point, new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(normal)));
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
points.push(new THREE.Vector3(0, -100_000, 0));
points.push(new THREE.Vector3(0, 100_000, 0));
axisGeometry.setFromPoints(points);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 1, 0);

export class AxisSnap extends Snap {
    readonly snapper = new THREE.Line(axisGeometry, new THREE.LineBasicMaterial());
    readonly helper = this.snapper;

    static X = new AxisSnap(new THREE.Vector3(1, 0, 0));
    static Y = new AxisSnap(new THREE.Vector3(0, 1, 0));
    static Z = new AxisSnap(new THREE.Vector3(0, 0, 1));

    readonly n = new THREE.Vector3();
    readonly o = new THREE.Vector3();

    protected readonly layer = Layers.AxisSnap;

    constructor(n: THREE.Vector3, o = new THREE.Vector3()) {
        super();
        this.snapper.position.copy(o);
        this.snapper.quaternion.setFromUnitVectors(Y, n);

        this.n.copy(n).normalize();
        this.o.copy(o);

        this.init();
    }

    private readonly projection = new THREE.Vector3();
    private readonly intersectionPoint = new THREE.Vector3();
    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { n, o } = this;
        const { projection, intersectionPoint } = this;
        return projection.copy(n).multiplyScalar(n.dot(intersectionPoint.copy(intersection.point).sub(o))).add(o);
    }

    protected readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return this.valid.copy(pt).sub(o).cross(n).lengthSq() < 10e-6
    }

    move(o: THREE.Vector3) {
        const { n } = this;
        return new AxisSnap(this.n, o.clone().add(this.o));
    }

    rotate(quat: THREE.Quaternion) {
        const { n, o } = this;
        return new AxisSnap(this.n.clone().applyQuaternion(quat), o);
    }
}

// A line snap looks like an axis snap (it has a Line helper) but valid click targets are actually
// any where other than the line's origin. It's used mainly for extruding, where you want to limit
// the direction of extrusion but allow the user to move the mouse wherever.
export class LineSnap extends AxisSnap {
    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { n, o } = this;
        return n.clone().multiplyScalar(n.dot(intersection.point.clone().sub(o))).add(o);
    }

    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return Math.abs(this.valid.copy(pt).sub(o).dot(n)) > 10e-6
    }
}

const planeGeo = new THREE.PlaneGeometry(10_000, 10_000, 2, 2);
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

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { n, p } = this;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
        return plane.projectPoint(intersection.point, new THREE.Vector3());
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
        return new c3d.Placement3D(vec2cart(this.p), new c3d.Vector3D(this.n.x, this.n.y, this.n.z), false);
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

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { worldDirection, projectionPoint } = this;

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldDirection, this.snapper.position);

        return plane.projectPoint(intersection.point, projectionPoint);
    }

    update(camera: THREE.Camera) {
        if (!(camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera)) throw Error("invalid precondition");

        const { worldDirection } = this;
        camera.getWorldDirection(worldDirection);

        this.snapper.position.copy(camera.position).add(worldDirection.clone().multiplyScalar(15));
        this.snapper.lookAt(worldDirection);
        this.snapper.updateMatrixWorld();
    }
}

export const originSnap = new PointSnap();

const map = new Map<any, number>();
map.set(PointSnap, 1);
map.set(CurveEdgeSnap, 2);
map.set(CurveSnap, 2);
map.set(FaceSnap, 3);
map.set(AxisSnap, 4);
map.set(PlaneSnap, 5);
map.set(ConstructionPlaneSnap, 6);

function sortIntersections(i1: THREE.Intersection, i2: THREE.Intersection) {
    const x = i1.object.userData.snap.priority ?? map.get(i1.object.userData.snap.constructor);
    const y = i2.object.userData.snap.priority ?? map.get(i2.object.userData.snap.constructor)
    if (x === undefined || y === undefined) {
        console.error(i1);
        console.error(i2);
        throw new Error("invalid precondition");
    }
    return x - y;
}
