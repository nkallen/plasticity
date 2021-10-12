import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point, vec2vec } from "../../util/Conversion";
import { Redisposable, RefCounter } from "../../util/Util";
import { CrossPointDatabase } from "../curves/CrossPointDatabase";
import { EditorSignals } from "../EditorSignals";
import { DatabaseLike } from "../GeometryDatabase";
import { MementoOriginator, SnapMemento } from "../History";
import * as visual from '../VisualModel';
import { AxisSnap, ConstructionPlaneSnap, CurveEdgeSnap, CurvePointSnap, CurveSnap, FacePointSnap, FaceSnap, CrossPointSnap, PlaneSnap, PointSnap, Restriction, Snap, TanTanSnap, AxisCrossPointSnap, EdgePointSnap, LineSnap, PointAxisSnap, CurveEndPointSnap } from "./Snap";

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
}

export class SnapManager implements MementoOriginator<SnapMemento> {
    isEnabled = true;
    private isToggled = false;

    private readonly basicSnaps = new Set<Snap>();

    private readonly id2snaps = new Map<c3d.SimpleName, Set<Snap>>();

    private nearbys: THREE.Object3D[] = []; // visual objects indicating nearby snap points
    private snappers: THREE.Object3D[] = []; // actual snap points

    readonly layers = new THREE.Layers();

    constructor(
        private readonly db: DatabaseLike,
        private readonly crosses: CrossPointDatabase,
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
        signals.objectUnhidden.add(item => this.add(item));
        signals.objectHidden.add(item => this.delete(item));

        this.layers.enableAll();

        this.update();
    }

    nearby(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): SnapResult[] {
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
            const snap = intersection.object.userData.snap as Snap;
            const { position, orientation } = snap.project(intersection);
            result.push({ snap, position, orientation });
        }
        performance.measure('nearby', 'begin-nearby');
        return result;
    }

    snap(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictionSnaps: Snap[] = [], restrictions: Restriction[] = []): SnapResult[] {
        performance.mark('begin-snap');
        // NOTE: restriction snaps, including the construction plane, are always snappable
        let snappers = restrictionSnaps.map(a => a.snapper);
        if (this.shouldSnap) {
            snappers = snappers.concat([...this.snappers, ...additional.map(a => a.snapper)]);
        }
        snappers = [...new Set(snappers)];

        raycaster.layers = this.layers;
        const snapperIntersections = raycaster.intersectObjects(snappers, true);
        snapperIntersections.sort(sortIntersections);
        const result: SnapResult[] = [];

        for (const intersection of snapperIntersections) {
            const snap = intersection.object.userData.snap as Snap;
            const { position, orientation } = snap.project(intersection);
            if (!this.satisfiesRestrictions(position, restrictions)) continue;
            result.push({ snap, position, orientation });
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
        let all = [...this.basicSnaps, ...this.crossSnaps];
        for (const snaps of this.id2snaps.values()) all = all.concat([...snaps]);
        this.nearbys = all.map((s) => s.nearby).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
        performance.measure('snap-update', 'begin-snap-update');
    }

    get crossSnaps(): CrossPointSnap[] {
        return [...this.crosses.crosses].map(cross => new CrossPointSnap(cross));
    }

    private add(item: visual.Item) {
        performance.mark('begin-snap-add');
        const fns: Redisposable[] = [];
        const snapsForItem = new Set<Snap>();
        this.id2snaps.set(item.simpleName, snapsForItem);
        if (item instanceof visual.Solid) {
            const model = this.db.lookup(item);
            const edges = model.GetEdges();
            const faces = model.GetFaces();
            for (const edge of item.edges) {
                this.addEdge(edge, edges[edge.index], snapsForItem);
            }
            for (const [i, face] of [...item.faces].entries()) {
                this.addFace(face, faces[i], snapsForItem);
            }
        } else if (item instanceof visual.SpaceInstance) {
            this.addCurve(item, snapsForItem);
        }

        performance.measure('snap-add', 'begin-snap-add');
        this.update();
    }

    private addFace(face: visual.Face, model: c3d.Face, into: Set<Snap>) {
        const faceSnap = new FaceSnap(face, model);
        into.add(faceSnap);

        const centerSnap = new FacePointSnap("Center", point2point(model.Point(0.5, 0.5)), vec2vec(model.Normal(0.5, 0.5), 1), faceSnap);
        into.add(centerSnap);
    }

    private addEdge(edge: visual.CurveEdge, model: c3d.CurveEdge, into: Set<Snap>) {
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new EdgePointSnap("Beginning", point2point(begPt));
        const midSnap = new EdgePointSnap("Middle", point2point(midPt));

        const edgeSnap = new CurveEdgeSnap(edge, model);
        into.add(edgeSnap);
        into.add(begSnap);
        into.add(midSnap);
    }

    private addCurve(view: visual.SpaceInstance<visual.Curve3D>, into: Set<Snap>) {
        const inst = this.db.lookup(view);
        const item_ = inst.GetSpaceItem()!;
        this.crosses.add(view.simpleName, item_.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D));

        if (item_.IsA() === c3d.SpaceType.Polyline3D) {
            const polyline = item_.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);

            const curveSnap = new CurveSnap(view, polyline);
            into.add(curveSnap);

            const points = polyline.GetPoints();
            const endSnaps = points.map(point =>
                new CurveEndPointSnap("End", point2point(point), curveSnap, polyline.NearPointProjection(point, false).t)
            );
            for (const endSnap of endSnaps) into.add(endSnap);

            const first = point2point(points.shift()!);
            let prev = first;
            const mid = new THREE.Vector3();
            const midSnaps: CurvePointSnap[] = [];
            for (const point of points) {
                const current = point2point(point);
                mid.copy(prev).add(current).multiplyScalar(0.5);
                const midSnap = new CurvePointSnap("Mid", mid, curveSnap, polyline.NearPointProjection(point2point(mid), false).t);
                midSnaps.push(midSnap);
                prev = current;
            }
            if (polyline.IsClosed()) {
                const current = first;
                mid.copy(prev).add(current).multiplyScalar(0.5);
                const midSnap = new CurvePointSnap("Mid", mid, curveSnap, polyline.NearPointProjection(point2point(mid), false).t);
                midSnaps.push(midSnap);
            }
            for (const midSnap of midSnaps) into.add(midSnap);
        } else {
            const curve = item_.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

            const curveSnap = new CurveSnap(view, curve);
            into.add(curveSnap);

            const min = curve.PointOn(curve.GetTMin());
            const mid = curve.PointOn(0.5 * (curve.GetTMin() + curve.GetTMax()));
            const max = curve.PointOn(curve.GetTMax());
            const begSnap = new CurveEndPointSnap("Beginning", point2point(min), curveSnap, curve.GetTMin());
            const midSnap = new CurveEndPointSnap("Middle", point2point(mid), curveSnap, 0.5 * (curve.GetTMin() + curve.GetTMax()));
            const endSnap = new CurveEndPointSnap("End", point2point(max), curveSnap, curve.GetTMax());
            into.add(begSnap);
            into.add(midSnap);
            into.add(endSnap);
        }
    }

    private delete(item: visual.Item): void {
        this.id2snaps.delete(item.simpleName);
        if (item instanceof visual.SpaceInstance) this.crosses.remove(item.simpleName);
        this.update();
    }

    toggle() {
        this.isToggled = !this.isToggled;
    }

    private get shouldSnap() {
        const { isEnabled, isToggled } = this;
        return (isEnabled && !isToggled) || (!isEnabled && isToggled);
    }

    saveToMemento(): SnapMemento {
        return new SnapMemento(new Map(this.id2snaps));
    }

    restoreFromMemento(m: SnapMemento) {
        (this.id2snaps as SnapManager['id2snaps']) = m.id2snaps;
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

    debug() {
        console.group("Snaps");
        console.groupEnd();
    }
}

export const originSnap = new PointSnap("Origin");

const priorities = new Map<any, number>();
priorities.set(CrossPointSnap, 1);
priorities.set(AxisCrossPointSnap, 1);
priorities.set(TanTanSnap, 1);
priorities.set(PointSnap, 1);
priorities.set(CurvePointSnap, 1);
priorities.set(CurveEndPointSnap, 1);
priorities.set(EdgePointSnap, 1);
priorities.set(CurveEdgeSnap, 2);
priorities.set(CurveSnap, 2);
priorities.set(FaceSnap, 3);
priorities.set(FacePointSnap, 3);
priorities.set(AxisSnap, 4);
priorities.set(PointAxisSnap, 4);
priorities.set(PlaneSnap, 5);
priorities.set(LineSnap, 5);
priorities.set(ConstructionPlaneSnap, 6);

function sortIntersections(i1: THREE.Intersection, i2: THREE.Intersection) {
    const snap1 = i1.object.userData.snap as Snap;
    const snap2 = i2.object.userData.snap as Snap;
    const x = priorities.get(snap1.constructor);
    const y = priorities.get(snap2.constructor)
    if (x === undefined || y === undefined) {
        console.error(i1);
        console.error(i2);
        throw new Error("invalid precondition: missing priority for " + `${i1.object.userData.snap.constructor.name}, ${i2.object.userData.snap.constructor.name}`);
    }
    const delta = x - y;
    if (delta != 0) return delta;
    else return snap2.counter - snap1.counter; // ensure deterministic order to avoid flickering
}
