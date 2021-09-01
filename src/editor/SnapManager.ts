import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import c3d from '../../build/Release/c3d.node';
import { GizmoMaterialDatabase } from "../commands/GizmoMaterials";
import { PointPicker } from "../commands/PointPicker";
import { cart2vec, vec2cart, vec2vec } from "../util/Conversion";
import { CircleGeometry, Redisposable, RefCounter } from "../util/Util";
import { EditorSignals } from "./EditorSignals";
import { DatabaseLike } from "./GeometryDatabase";
import { MementoOriginator, SnapMemento } from "./History";
import * as visual from './VisualModel';

const discGeometry = new THREE.CircleGeometry(0.03, 16);
const circleGeometry = new LineGeometry();
circleGeometry.setPositions(CircleGeometry(0.05, 16));

export enum Layers {
    PointSnap,
    CurveEdgeSnap,
    CurveSnap,
    AxisSnap,
    PlaneSnap,
    ConstructionPlaneSnap,
    FaceSnap
}

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    indicator: THREE.Object3D;
}

export class SnapManager implements MementoOriginator<SnapMemento> {
    isEnabled = true;
    private isToggled = false;

    private readonly basicSnaps = new Set<Snap>();

    private readonly begPoints = new Set<PointSnap>();
    private readonly midPoints = new Set<PointSnap>();
    private readonly endPoints = new Set<PointSnap>();
    private readonly centerPoints = new Set<PointSnap>();
    private readonly faces = new Set<FaceSnap>();
    private readonly edges = new Set<CurveEdgeSnap>();
    private readonly curves = new Set<CurveSnap>();
    private readonly garbageDisposal = new RefCounter<c3d.SimpleName>();

    private nearbys: THREE.Object3D[] = []; // visual objects indicating nearby snap points
    private snappers: THREE.Object3D[] = []; // actual snap points

    readonly layers = new THREE.Layers();

    constructor(
        private readonly db: DatabaseLike,
        private readonly materials: GizmoMaterialDatabase,
        signals: EditorSignals
    ) {
        this.basicSnaps.add(originSnap);
        this.basicSnaps.add(new AxisSnap("X", new THREE.Vector3(1, 0, 0)));
        this.basicSnaps.add(new AxisSnap("Y", new THREE.Vector3(0, 1, 0)));
        this.basicSnaps.add(new AxisSnap("Z", new THREE.Vector3(0, 0, 1)));
        Object.freeze(this.basicSnaps);

        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.add(item);
        });
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.delete(item);
        });
        signals.objectUnhidden.add(item => this.add(item) );
        signals.objectHidden.add(item => this.delete(item) );

        this.layers.enableAll();

        this.update();
    }

    nearby(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): THREE.Object3D[] {
        if (!this.shouldSnap) return [];
        performance.mark('begin-nearby');

        const additionalNearbys = [];
        for (const a of additional) if (a.nearby !== undefined) additionalNearbys.push(a.nearby);
        const nearbys = [...this.nearbys, ...additionalNearbys];

        raycaster.layers = this.layers;
        const intersections = raycaster.intersectObjects(nearbys);
        const result = [];
        for (const intersection of intersections) {
            if (!this.satisfiesRestrictions(intersection.object.position, restrictions)) continue;

            const indicator = this.hoverIndicatorFor(intersection);
            result.push(indicator);
        }
        performance.measure('nearby', 'begin-nearby');
        return result;
    }

    snap(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictionSnaps: Snap[] = [], restrictions: Restriction[] = []): SnapResult[] {
        performance.mark('begin-snap');
        let snappers = restrictionSnaps.map(a => a.snapper);
        if (this.shouldSnap) {
            snappers = snappers.concat([...this.snappers, ...additional.map(a => a.snapper)]);
        }

        raycaster.layers = this.layers;
        const snapperIntersections = raycaster.intersectObjects(snappers, true);
        snapperIntersections.sort(sortIntersections);
        const result: SnapResult[] = [];

        for (const intersection of snapperIntersections) {
            const [snap, { position, orientation }] = this.helperFor(intersection);
            if (!this.satisfiesRestrictions(position, restrictions)) continue;
            const indicator = this.snapIndicatorFor(intersection);
            result.push({ snap, position, indicator });
        }
        performance.measure('snap', 'begin-snap');
        return result;
    }

    private satisfiesRestrictions(point: THREE.Vector3, restrictions: Restriction[]): boolean {
        for (const restriction of restrictions) {
            if (!restriction.isValid(point)) return false;
        }
        return true;
    }

    private update() {
        performance.mark('begin-snap-update');
        const all = [...this.basicSnaps, ...this.begPoints, ...this.midPoints, ...this.centerPoints, ...this.endPoints, ...this.faces, ...this.edges, ...this.curves];
        for (const a of all) {
            a.snapper.userData.snapper = a;
            if (a.nearby !== undefined) a.nearby.userData.snapper = a;
        }
        this.nearbys = all.map((s) => s.nearby).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
        performance.measure('snap-update', 'begin-snap-update');
    }

    private add(item: visual.Item) {
        performance.mark('begin-snap-add');
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
        performance.measure('snap-add', 'begin-snap-add');
        this.update();
    }

    private addFace(face: visual.Face): Redisposable {
        const model = this.db.lookupTopologyItem(face);

        const faceSnap = new FaceSnap(face, model);
        this.faces.add(faceSnap);

        const centerSnap = new PointSnap("Center", cart2vec(model.Point(0.5, 0.5)), vec2vec(model.Normal(0.5, 0.5)));
        this.centerPoints.add(centerSnap);

        return new Redisposable(() => {
            this.faces.delete(faceSnap);
            this.centerPoints.delete(centerSnap);
        });
    }

    private addEdge(edge: visual.CurveEdge): Redisposable {
        const model = this.db.lookupTopologyItem(edge);
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new PointSnap("Beginning", cart2vec(begPt));
        const midSnap = new PointSnap("Middle", cart2vec(midPt));

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
        const begSnap = new PointSnap("Beginning", cart2vec(min));
        const midSnap = new PointSnap("Middle", cart2vec(mid));
        const endSnap = new PointSnap("End", cart2vec(max));
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
        const disc = new THREE.Mesh(discGeometry, this.materials.black.hover.mesh);

        const snap = intersection.object.userData.snap as Snap;
        const { position, orientation } = snap.project(intersection);
        disc.position.copy(position);
        disc.quaternion.copy(orientation);
        return disc;
    }

    private snapIndicatorFor(intersection: THREE.Intersection): THREE.Object3D {
        const circle = new Line2(circleGeometry, this.materials.black.line2);

        const snap = intersection.object.userData.snap as Snap;
        const { position, orientation } = snap.project(intersection);
        circle.position.copy(position);
        circle.quaternion.copy(orientation);
        return circle;
    }

    private helperFor(intersection: THREE.Intersection): [Snap, { position: THREE.Vector3, orientation: THREE.Quaternion }] {
        const snap = intersection.object.userData.snap as Snap;
        return [snap, snap.project(intersection)];
    }

    toggle() {
        this.isToggled = !this.isToggled;
    }

    private get shouldSnap() {
        const { isEnabled, isToggled } = this;
        return (isEnabled && !isToggled) || (!isEnabled && isToggled);
    }

    saveToMemento(): SnapMemento {
        return new SnapMemento(
            new RefCounter(this.garbageDisposal),
            new Set(this.faces),
            new Set(this.edges),
            new Set(this.curves),
            new Set(this.begPoints),
            new Set(this.midPoints),
            new Set(this.endPoints),
            new Set(this.centerPoints));
    }

    restoreFromMemento(m: SnapMemento) {
        (this.faces as SnapManager['faces']) = m.faces;
        (this.edges as SnapManager['edges']) = m.edges;
        (this.curves as SnapManager['curves']) = m.curves;
        (this.begPoints as SnapManager['begPoints']) = m.begPoints;
        (this.midPoints as SnapManager['midPoints']) = m.midPoints;
        (this.endPoints as SnapManager['endPoints']) = m.endPoints;
        (this.centerPoints as SnapManager['centerPoints']) = m.centerPoints;
        this.update();
    }

    serialize(): Promise<Buffer> {
        throw new Error("Method not implemented.");
    }
    deserialize(data: Buffer): Promise<void> {
        throw new Error("Method not implemented.");
    }

    validate() {
        
    }
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
            c.layers.set(this.layer)
            c.userData.snap = this;
        });

        if (nearby != null) nearby.userData.snap = this;
        nearby?.layers.set(this.layer);
        nearby?.traverse(c => {
            c.userData.snap = this;
            c.layers.set(this.layer)
        });
    }

    abstract project(intersection: THREE.Intersection): { position: THREE.Vector3, orientation: THREE.Quaternion };
    abstract isValid(pt: THREE.Vector3): boolean;

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) { }
    additionalSnapsFor(point: THREE.Vector3): Snap[] { return [] }
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
        return this.snapper.position.manhattanDistanceTo(pt) < 10e-6
    }
}

export class CurveEdgeSnap extends Snap {
    readonly name = "Edge";
    t!: number;
    readonly snapper = new Line2(this.view.child.geometry, this.view.child.material);
    protected readonly layer = Layers.CurveEdgeSnap;

    constructor(readonly view: visual.CurveEdge, readonly model: c3d.CurveEdge) {
        super();
        this.init();
    }

    project(intersection: THREE.Intersection) {
        const pt = intersection.point;
        const t = this.model.PointProjection(vec2cart(pt));
        const on = this.model.Point(t);
        const tan = this.model.GetSpaceCurve()!.Tangent(t);
        this.t = t;
        const position = cart2vec(on);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(tan));
        return { position, orientation }
    }

    isValid(pt: THREE.Vector3): boolean {
        const t = this.model.PointProjection(vec2cart(pt));
        const on = this.model.Point(t);
        const result = pt.manhattanDistanceTo(new THREE.Vector3(on.x, on.y, on.z)) < 10e-4;
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
            this.snapper.add(new Line2(segment.line.geometry, segment.line.material));
        }
        this.init();
    }

    project(intersection: THREE.Intersection) {
        const pt = intersection.point;
        const { t } = this.model.NearPointProjection(vec2cart(pt), false);
        const on = this.model.PointOn(t);
        const tan = this.model.Tangent(t);
        this.t = t;
        const position = cart2vec(on);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(tan));
        return { position, orientation }
    }

    isValid(pt: THREE.Vector3): boolean {
        const { t } = this.model.NearPointProjection(vec2cart(pt), false);
        const on = this.model.PointOn(t);
        const result = pt.manhattanDistanceTo(new THREE.Vector3(on.x, on.y, on.z)) < 10e-4;
        return result;
    }

    additionalSnapsFor(point: THREE.Vector3) {
        const { model } = this;
        const { t } = this.model.NearPointProjection(vec2cart(point), false);
        let normal = vec2vec(model.Normal(t));
        let binormal = vec2vec(model.BNormal(t));
        const tangent = vec2vec(model.Tangent(t));

        // in the case of straight lines, there is a tangent but no normal/binormal
        if (normal.manhattanDistanceTo(zero) < 10e-6) {
            normal.copy(tangent).cross(Z);
            if (normal.manhattanDistanceTo(zero) < 10e-6) normal.copy(tangent).cross(Y);
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
}

export class FaceSnap extends Snap {
    readonly name = "Face";
    readonly snapper = new THREE.Mesh(this.view.child.geometry);
    protected readonly layer = Layers.FaceSnap;

    constructor(readonly view: visual.Face, readonly model: c3d.Face) {
        super();
        this.init();
    }

    project(intersection: THREE.Intersection) {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(vec2cart(intersection.point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = cart2vec(model.Point(faceU, faceV));
        const position = projected;
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, vec2vec(normal));
        return { position, orientation }
    }

    isValid(point: THREE.Vector3): boolean {
        const { model } = this;
        const { u, v, normal } = model.NearPointProjection(vec2cart(point));
        const { faceU, faceV } = model.GetFaceParam(u, v);
        const projected = cart2vec(model.Point(faceU, faceV));
        const result = point.manhattanDistanceTo(new THREE.Vector3(projected.x, projected.y, projected.z)) < 10e-4;
        return result;
    }

    addAdditionalRestrictionsTo(pointPicker: PointPicker, point: THREE.Vector3) {
        const { normal } = this.model.NearPointProjection(vec2cart(point));
        const plane = new PlaneSnap(vec2vec(normal), point);
        pointPicker.restrictToPlane(plane);
    }

    additionalSnapsFor(point: THREE.Vector3) {
        const { model } = this;
        const { normal } = model.NearPointProjection(vec2cart(point));
        const normalSnap = new AxisSnap("Normal", vec2vec(normal), point)
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
points.push(new THREE.Vector3(0, -100_000, 0));
points.push(new THREE.Vector3(0, 100_000, 0));
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
        return { position, orientation }
    }

    protected readonly valid = new THREE.Vector3();
    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return this.valid.copy(pt).sub(o).cross(n).lengthSq() < 10e-6
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
    readonly snapper = this.plane.snapper;
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
        const plane = new PlaneSnap(p, origin);
        return new LineSnap(name, axis, plane);
    }

    private constructor(readonly name: string | undefined, private readonly axis: AxisSnap, private readonly plane: PlaneSnap) {
        super();
    }

    project(intersection: THREE.Intersection) {
        return this.axis.project(intersection);
    }

    isValid(pt: THREE.Vector3): boolean {
        return this.plane.isValid(pt);
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

    project(intersection: THREE.Intersection) {
        const { n, p } = this;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
        const position = plane.projectPoint(intersection.point, new THREE.Vector3());
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, n);
        return { position, orientation }
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

    project(intersection: THREE.Intersection) {
        const { worldDirection, projectionPoint } = this;

        const plane = new THREE.Plane();
        plane.setFromNormalAndCoplanarPoint(worldDirection, this.snapper.position);

        const position = plane.projectPoint(intersection.point, projectionPoint);
        const orientation = new THREE.Quaternion().setFromUnitVectors(Z, worldDirection);
        return { position, orientation }
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

export const originSnap = new PointSnap("Origin");

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
