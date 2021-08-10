import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { cart2vec, vec2cart, vec2vec } from "../util/Conversion";
import { RefCounter } from "../util/Util";
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { SnapMemento } from "./History";
import { SpriteDatabase } from "./SpriteDatabase";
import * as visual from './VisualModel';

export interface Raycaster {
    intersectObjects(objects: THREE.Object3D[], recursive?: boolean, optionalTarget?: THREE.Intersection[]): THREE.Intersection[];
}

export class SnapManager {
    private readonly basicSnaps = new Set<Snap>();

    private readonly begPoints = new Set<Snap>();
    private readonly midPoints = new Set<Snap>();
    private readonly endPoints = new Set<Snap>();
    private readonly garbageDisposal = new RefCounter<c3d.SimpleName>();

    pickers: THREE.Object3D[] = []; // visual objects indicating nearby snap points
    snappers: THREE.Object3D[] = []; // actual snap points

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

        signals.objectAdded.add(item => this.add(item));
        signals.objectRemoved.add(item => this.delete(item));

        this.update();
    }

    // FIXME move into the model of PointPicker?
    nearby(raycaster: Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): THREE.Object3D[] {
        const additionalPickers = [];
        for (const a of additional) if (a.picker !== undefined) additionalPickers.push(a.picker);

        const pickerIntersections = raycaster.intersectObjects([...this.pickers, ...additionalPickers]);
        const result = [];
        for (const intersection of pickerIntersections) {
            if (!this.satisfiesRestrictions(intersection.object.position, restrictions)) continue;

            const sprite = this.hoverIndicatorFor(intersection);
            result.push(sprite);
        }
        return result;
    }

    snap(raycaster: Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): [Snap, THREE.Vector3][] {
        const snappers = [...this.snappers, ...additional.map(a => a.snapper)];
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
        const all = [...this.basicSnaps, ...this.begPoints, ...this.midPoints, ...this.endPoints];
        for (const a of all) {
            a.snapper.userData.snapper = a;
            if (a.picker !== undefined) a.picker.userData.snapper = a;
        }
        this.pickers = all.map((s) => s.picker).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
    }

    private add(item: visual.Item): void {
        const fns: (() => void)[] = [];
        if (item instanceof visual.Solid) {
            for (const edge of item.edges) {
                const d = this.addEdge(edge);
                fns.push(d);
            }
        } else if (item instanceof visual.SpaceInstance) {
            const d = this.addCurve(item);
            fns.push(d);
        }

        this.garbageDisposal.incr(item.simpleName, () => {
            for (const fn of fns) fn()
        });
        this.update();
    }

    private addEdge(edge: visual.CurveEdge) {
        const model = this.db.lookupTopologyItem(edge) as c3d.Edge;
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new PointSnap(cart2vec(begPt));
        const midSnap = new PointSnap(cart2vec(midPt));

        this.begPoints.add(begSnap);
        this.midPoints.add(midSnap);
        return () => {
            this.begPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
        };
    }

    private addCurve(item: visual.SpaceInstance<visual.Curve3D>) {
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
        return () => {
            this.begPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
            this.endPoints.delete(endSnap);
        };
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
            new Set(this.begPoints),
            new Set(this.midPoints),
            new Set(this.endPoints));
    }

    restoreFromMemento(m: SnapMemento) {
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
    snapper: THREE.Object3D;
    picker?: THREE.Object3D;
    helper?: THREE.Object3D;
    priority?: number;

    constructor(snapper: THREE.Object3D, picker?: THREE.Object3D, helper?: THREE.Object3D) {
        snapper.userData.snap = this;
        if (picker != null) picker.userData.snap = this;
        snapper.updateMatrixWorld();
        picker?.updateMatrixWorld();
        helper?.updateMatrixWorld();

        this.snapper = snapper;
        this.picker = picker;
        this.helper = helper;
    }

    abstract project(intersection: THREE.Intersection): THREE.Vector3;
    abstract isValid(pt: THREE.Vector3): boolean;
}

export class PointSnap extends Snap {
    private readonly projection: THREE.Vector3;

    constructor(position = new THREE.Vector3()) {
        const snapper = new THREE.Mesh(new THREE.SphereGeometry(0.1));
        const picker = new THREE.Mesh(new THREE.SphereGeometry(0.2));
        snapper.position.copy(position);
        picker.position.copy(position);

        super(snapper, picker);
        this.projection = position.clone();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return this.projection;
    }

    axes(axisSnaps: Set<AxisSnap>) {
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

    get view() { return this.snapper as visual.CurveEdge }

    constructor(view: visual.CurveEdge, readonly model: c3d.CurveEdge) {
        super(view);
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const pt = intersection.point;
        const t = this.model.PointProjection(new c3d.CartPoint3D(pt.x, pt.y, pt.z));
        const on = this.model.Point(t);
        this.t = t;
        return new THREE.Vector3(on.x, on.y, on.z);
    }

    isValid(pt: THREE.Vector3): boolean {
        const t = this.model.PointProjection(new c3d.CartPoint3D(pt.x, pt.y, pt.z));
        const on = this.model.Point(t);
        const result = pt.distanceToSquared(new THREE.Vector3(on.x, on.y, on.z)) < 10e-4;
        return result;
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

export class AxisSnap extends Snap {
    static X = new AxisSnap(new THREE.Vector3(1, 0, 0));
    static Y = new AxisSnap(new THREE.Vector3(0, 1, 0));
    static Z = new AxisSnap(new THREE.Vector3(0, 0, 1));

    readonly n: THREE.Vector3;
    readonly o: THREE.Vector3;

    constructor(n: THREE.Vector3, o = new THREE.Vector3()) {
        n = n.clone().normalize().multiplyScalar(1000);
        const points = [
            o.x - n.x, o.y - n.y, o.z - n.z,
            o.x + n.x, o.y + n.y, o.z + n.z];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const snapper = new THREE.Line(geometry, new THREE.LineBasicMaterial());

        super(snapper, undefined, snapper);
        this.n = n.normalize();
        this.o = o.clone();
        this.valid = new THREE.Vector3();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { n, o } = this;
        return n.clone().multiplyScalar(n.dot(intersection.point.clone().sub(o))).add(o);
    }

    protected readonly valid: THREE.Vector3;
    isValid(pt: THREE.Vector3): boolean {
        const { n, o } = this;
        return this.valid.copy(pt).sub(o).cross(n).lengthSq() < 10e-6
    }

    move(o: THREE.Vector3) {
        const { n } = this;
        return new AxisSnap(this.n, o.clone().add(this.o));
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
    static X = new PlaneSnap(new THREE.Vector3(1, 0, 0));
    static Y = new PlaneSnap(new THREE.Vector3(0, 1, 0));
    static Z = new PlaneSnap(new THREE.Vector3(0, 0, 1));

    readonly n: THREE.Vector3;
    readonly p: THREE.Vector3;

    constructor(n: THREE.Vector3 = new THREE.Vector3(0, 0, 1), p: THREE.Vector3 = new THREE.Vector3()) {
        n = n.clone();
        p = p.clone();
        const mesh = new THREE.Mesh(planeGeo, mat);
        mesh.lookAt(n);
        mesh.position.copy(p);
        super(mesh);
        this.n = n;
        this.p = p;
        this.valid = new THREE.Vector3();
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { n, p } = this;
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p);
        return plane.projectPoint(intersection.point, new THREE.Vector3());
    }

    move(pt: THREE.Vector3): PlaneSnap {
        return new PlaneSnap(this.n, pt);
    }

    private readonly valid: THREE.Vector3;
    isValid(pt: THREE.Vector3): boolean {
        const { n, p } = this;
        return Math.abs(pt.clone().sub(p).dot(n)) < 10e-4;
    }

    update(camera: THREE.Camera) { }

    get placement() {
        return new c3d.Placement3D(vec2cart(this.p), new c3d.Vector3D(this.n.x, this.n.y, this.n.z), false);
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
map.set(AxisSnap, 2);
map.set(PlaneSnap, 3);

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