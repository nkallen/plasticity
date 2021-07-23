import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { cart2vec } from "../util/Conversion";
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
        const snapperIntersections = raycaster.intersectObjects([...this.snappers, ...additional.map(a => a.snapper)]);
        snapperIntersections.sort((s1, s2) => s1.object.userData.sort - s2.object.userData.sort);
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
        this.pickers = all.map((s) => s.picker).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
    }

    private add(item: visual.Item): void {
        const disposable = new CompositeDisposable();
        if (item instanceof visual.Solid) {
            for (const edge of item.edges) {
                const d = this.addEdge(edge);
                disposable.add(d);
            }
        } else if (item instanceof visual.SpaceInstance) {
            const d = this.addCurve(item);
            disposable.add(d);
        }

        this.garbageDisposal.incr(item.simpleName, disposable);
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
        return new Disposable(() => {
            this.begPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
        });
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
        return new Disposable(() => {
            this.begPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
            this.endPoints.delete(endSnap);
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
        this.projection = position;
        snapper.userData.sort = 0;
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

    constructor(readonly view: visual.CurveEdge, readonly model: c3d.CurveEdge) {
        super(view);
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const pt = intersection.point;
        const t = this.model.PointProjection(new c3d.CartPoint3D(pt.x, pt.y, pt.z));
        const on = this.model.Point(t);
        console.log("setting", t);
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

    constructor(n: THREE.Vector3, o = new THREE.Vector3()) {
        n = n.normalize().multiplyScalar(1000);
        const points = [
            o.x - n.x, o.y - n.y, o.z - n.z,
            o.x + n.x, o.y + n.y, o.z + n.z];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        const snapper = new THREE.Line(geometry, new THREE.LineBasicMaterial());

        super(snapper, undefined, snapper);
        snapper.userData.sort = 1;
        this.n = n;
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return intersection.point;
    }

    isValid(pt: THREE.Vector3): boolean {
        return pt.clone().cross(this.n).lengthSq() < 10e-6
    }

    move(o: THREE.Vector3) {
        return new AxisSnap(this.n, o.clone().add(this.snapper.position));
    }
}

export class PlaneSnap extends Snap {
    readonly n: THREE.Vector3;
    readonly p: THREE.Vector3;

    constructor(n: THREE.Vector3 = new THREE.Vector3(0, 0, 1), p: THREE.Vector3 = new THREE.Vector3()) {
        const planeGeo = new THREE.PlaneGeometry(1000, 1000, 2, 2);
        const mesh = new THREE.Mesh(planeGeo);
        mesh.lookAt(n);
        mesh.position.copy(p);
        super(mesh);
        this.n = n;
        this.p = p;
        mesh.userData.sort = 2;
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        const { n, p } = this;
        const plane = new THREE.Plane(n, p.dot(n));
        return plane.projectPoint(intersection.point, new THREE.Vector3());
    }

    restrict(pt: THREE.Vector3): PlaneSnap {
        return new PlaneSnap(this.n, pt);
    }

    isValid(pt: THREE.Vector3): boolean {
        return Math.abs(pt.clone().sub(this.snapper.position).dot(this.n)) < 10e-4;
    }
}

export const originSnap = new PointSnap();
