import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import * as visual from '../src/VisualModel';
import { EditorSignals } from "./Editor";
import { GeometryDatabase } from "./GeometryDatabase";
import { SnapMemento } from "./History";
import { SpriteDatabase } from "./SpriteDatabase";

export class SnapManager {
    private readonly snaps = new Set<Snap>();

    private readonly begPoints = new Set<Snap>();
    private readonly midPoints = new Set<Snap>();
    private readonly endPoints = new Set<Snap>();

    pickers: THREE.Object3D[] = [];
    snappers: THREE.Object3D[] = [];

    constructor(
        private readonly db: GeometryDatabase,
        private readonly sprites: SpriteDatabase,
        signals: EditorSignals) {
        this.snaps.add(originSnap);
        this.snaps.add(new AxisSnap(new THREE.Vector3(1, 0, 0)));
        this.snaps.add(new AxisSnap(new THREE.Vector3(0, 1, 0)));
        this.snaps.add(new AxisSnap(new THREE.Vector3(0, 0, 1)));
        Object.freeze(this.snaps);

        signals.objectAdded.add(item => this.add(item));
        signals.objectRemoved.add(item => this.delete(item));

        this.update();
    }

    pick(raycaster: THREE.Raycaster, additional: Snap[] = []): THREE.Object3D[] {
        const additionalPickers = [];
        for (const a of additional) if (a.picker !== undefined) additionalPickers.push(a.picker);

        const pickerIntersections = raycaster.intersectObjects([...this.pickers, ...additionalPickers]);
        const result = [];
        for (const intersection of pickerIntersections) {
            const sprite = this.hoverIndicatorFor(intersection);
            result.push(sprite);
        }
        return result;
    }

    snap(raycaster: THREE.Raycaster, constructionPlane: THREE.Object3D, additional: Snap[] = []): [THREE.Object3D, THREE.Vector3][] {
        const snapperIntersections = raycaster.intersectObjects([constructionPlane, ...this.snappers, ...additional.map(a => a.snapper)]);
        snapperIntersections.sort((s1, s2) => s1.object.userData.sort - s2.object.userData.sort);
        const result = [];
        for (const intersection of snapperIntersections) {
            const h = this.helperFor(intersection);
            result.push(h);
        }
        return result;
    }

    private update() {
        const all = [...this.snaps, ...this.begPoints, ...this.midPoints, ...this.endPoints];
        this.pickers = all.map((s) => s.picker).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
    }

    private add(item: visual.Item): void {
        if (item instanceof visual.Solid) {
            for (const edge of item.edges) {
                this.addEdge(edge); // FIXME maybe lookup edges in a more efficient way
            }
        } else if (item instanceof visual.SpaceInstance) {
            this.addCurve(item);
        }

        this.update();
    }

    private addEdge(edge: visual.CurveEdge) {
        const model = this.db.lookupTopologyItem(edge) as c3d.Edge;
        const begPt = model.GetBegPoint();
        const begSnap = new PointSnap(begPt.x, begPt.y, begPt.z);
        this.begPoints.add(begSnap);

        const midPt = model.Point(0.5);
        const midSnap = new PointSnap(midPt.x, midPt.y, midPt.z);
        this.midPoints.add(midSnap);

        edge.snaps.add(midSnap);
        edge.snaps.add(begSnap);
    }

    private addCurve(item: visual.SpaceInstance<visual.Curve3D>) {
        const inst = this.db.lookup(item);
        const curve = inst.GetSpaceItem().Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
        const min = curve.PointOn(curve.GetTMin());
        const mid = curve.PointOn(0.5 * (curve.GetTMin() + curve.GetTMax()));
        const max = curve.PointOn(curve.GetTMax());
        const begSnap = new PointSnap(min.x, min.y, min.z);
        const midSnap = new PointSnap(mid.x, mid.y, mid.z);
        const endSnap = new PointSnap(max.x, max.y, max.z);
        this.begPoints.add(begSnap);
        this.midPoints.add(midSnap);
        this.endPoints.add(endSnap);
        item.snaps.add(begSnap); // FIXME replace with refcounter?
        item.snaps.add(midSnap);
        item.snaps.add(endSnap);
    }

    private delete(item: visual.SpaceItem): void {
        if (item instanceof visual.Solid) {
            for (const edge of item.edges) {
                for (const snap of edge.snaps) {
                    this.begPoints.delete(snap);
                    this.midPoints.delete(snap);
                    this.endPoints.delete(snap);
                }
            }
        } else if (item instanceof visual.SpaceInstance) {
            for (const snap of item.snaps) {
                this.begPoints.delete(snap);
                this.midPoints.delete(snap);
                this.endPoints.delete(snap);
            }
        }

        this.update();
    }

    hoverIndicatorFor(intersection: THREE.Intersection): THREE.Object3D {
        const sprite = this.sprites.isNear();
        const snap = intersection.object.userData.snap;
        sprite.position.copy(snap.project(intersection));
        return sprite;
    }

    helperFor(intersection: THREE.Intersection): [THREE.Object3D, THREE.Vector3] {
        const snap = intersection.object.userData.snap;
        const helper = snap.helper;
        return [helper, snap.project(intersection)];
    }

    saveToMemento(registry: Map<any, any>): SnapMemento {
        return new SnapMemento(
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

export abstract class Snap {
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

        Object.freeze(snapper);
        Object.freeze(picker);
        Object.freeze(helper);
    }

    abstract project(intersection: THREE.Intersection): THREE.Vector3;
}

export class PointSnap extends Snap {
    private readonly projection: THREE.Vector3;

    constructor(x = 0, y = 0, z = 0) {
        const snapper = new THREE.Mesh(new THREE.SphereGeometry(0.1));
        const picker = new THREE.Mesh(new THREE.SphereGeometry(0.5));
        snapper.position.set(x, y, z);
        picker.position.set(x, y, z);

        super(snapper, picker);
        this.projection = new THREE.Vector3(x, y, z);
        snapper.userData.sort = 0;
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return this.projection;
    }

    get axes() {
        const o = this.projection.clone();
        return [
            new AxisSnap(new THREE.Vector3(1, 0, 0), o),
            new AxisSnap(new THREE.Vector3(0, 1, 0), o),
            new AxisSnap(new THREE.Vector3(0, 0, 1), o)];
    }
}

export class AxisSnap extends Snap {
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
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return intersection.point;
    }
}

export class PlaneSnap extends Snap {
    readonly n: THREE.Vector3;

    constructor(n: THREE.Vector3, p: THREE.Vector3 = new THREE.Vector3()) {
        const planeGeo = new THREE.PlaneGeometry(1000, 1000, 2, 2);
        const mesh = new THREE.Mesh(planeGeo);
        mesh.lookAt(n);
        mesh.position.copy(p);
        super(mesh);
        this.n = n;
        mesh.userData.sort = 2;
    }

    project(intersection: THREE.Intersection): THREE.Vector3 {
        return intersection.point;
    }

    restrict(pt: THREE.Vector3): PlaneSnap {
        return new PlaneSnap(this.n, pt);
    }
}

const originSnap = new PointSnap();
