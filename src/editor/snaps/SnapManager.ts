import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { point2point, vec2vec } from "../../util/Conversion";
import { Redisposable, RefCounter } from "../../util/Util";
import { CrossPointDatabase } from "../curves/CrossPointDatabase";
import { EditorSignals } from "../EditorSignals";
import { DatabaseLike } from "../GeometryDatabase";
import { MementoOriginator, SnapMemento } from "../History";
import * as visual from '../VisualModel';
import { AxisSnap, ConstructionPlaneSnap, CurveEdgeSnap, CurvePointSnap, CurveSnap, FacePointSnap, FaceSnap, CrossPointSnap, PlaneSnap, PointSnap, Restriction, Snap, TanTanSnap, AxisCrossPointSnap, EdgePointSnap } from "./Snap";

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    orientation: THREE.Quaternion;
}

export class SnapManager implements MementoOriginator<SnapMemento> {
    isEnabled = true;
    private isToggled = false;

    private readonly basicSnaps = new Set<Snap>();

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
        const all = [...this.basicSnaps, ...this.midPoints, ...this.centerPoints, ...this.endPoints, ...this.faces, ...this.edges, ...this.curves, ...this.crossSnaps];
        for (const a of all) {
            a.snapper.userData.snapper = a;
            if (a.nearby !== undefined) a.nearby.userData.snapper = a;
        }
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
        if (item instanceof visual.Solid) {
            const model = this.db.lookup(item);
            const edges = model.GetEdges();
            const faces = model.GetFaces();
            for (const edge of item.edges) {
                const d = this.addEdge(edge, edges[edge.index]);
                fns.push(d);
            }
            for (const [i, face] of [...item.faces].entries()) {
                const d = this.addFace(face, faces[i]);
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

    private addFace(face: visual.Face, model: c3d.Face): Redisposable {
        const faceSnap = new FaceSnap(face, model);
        this.faces.add(faceSnap);

        const centerSnap = new FacePointSnap("Center", point2point(model.Point(0.5, 0.5)), vec2vec(model.Normal(0.5, 0.5), 1), faceSnap);
        this.centerPoints.add(centerSnap);

        return new Redisposable(() => {
            this.faces.delete(faceSnap);
            this.centerPoints.delete(centerSnap);
        });
    }

    private addEdge(edge: visual.CurveEdge, model: c3d.CurveEdge): Redisposable {
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new EdgePointSnap("Beginning", point2point(begPt));
        const midSnap = new EdgePointSnap("Middle", point2point(midPt));

        const edgeSnap = new CurveEdgeSnap(edge, model);
        this.edges.add(edgeSnap);

        this.endPoints.add(begSnap);
        this.midPoints.add(midSnap);
        return new Redisposable(() => {
            this.endPoints.delete(begSnap);
            this.midPoints.delete(midSnap);
            this.edges.delete(edgeSnap);
        });
    }

    private addCurve(view: visual.SpaceInstance<visual.Curve3D>): Redisposable {
        const inst = this.db.lookup(view);
        const item_ = inst.GetSpaceItem()!;
        this.crosses.add(view.simpleName, item_.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D));

        if (item_.IsA() === c3d.SpaceType.Polyline3D) {
            const polyline = item_.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);

            const curveSnap = new CurveSnap(view, polyline);
            this.curves.add(curveSnap);

            const points = polyline.GetPoints();
            const endSnaps = points.map(point =>
                new CurvePointSnap("End", point2point(point), curveSnap, polyline.NearPointProjection(point, false).t)
            );
            for (const endSnap of endSnaps) this.endPoints.add(endSnap);

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
            for (const midSnap of midSnaps) this.midPoints.add(midSnap);

            return new Redisposable(() => {
                for (const endSnap of endSnaps) this.endPoints.delete(endSnap);
                for (const midSnap of midSnaps) this.midPoints.delete(midSnap);
                this.curves.delete(curveSnap);
            });
        } else {
            const curve = item_.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

            const curveSnap = new CurveSnap(view, curve);
            this.curves.add(curveSnap);

            const min = curve.PointOn(curve.GetTMin());
            const mid = curve.PointOn(0.5 * (curve.GetTMin() + curve.GetTMax()));
            const max = curve.PointOn(curve.GetTMax());
            const begSnap = new CurvePointSnap("Beginning", point2point(min), curveSnap, curve.GetTMin());
            const midSnap = new CurvePointSnap("Middle", point2point(mid), curveSnap, 0.5 * (curve.GetTMin() + curve.GetTMax()));
            const endSnap = new CurvePointSnap("End", point2point(max), curveSnap, curve.GetTMax());
            this.endPoints.add(begSnap);
            this.midPoints.add(midSnap);
            this.endPoints.add(endSnap);

            return new Redisposable(() => {
                this.endPoints.delete(begSnap);
                this.midPoints.delete(midSnap);
                this.endPoints.delete(endSnap);
                this.curves.delete(curveSnap);
            });
        }
    }

    private delete(item: visual.Item): void {
        this.garbageDisposal.delete(item.simpleName);
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
        return new SnapMemento(
            new RefCounter(this.garbageDisposal),
            new Set(this.faces),
            new Set(this.edges),
            new Set(this.curves),
            new Set(this.midPoints),
            new Set(this.endPoints),
            new Set(this.centerPoints));
    }

    restoreFromMemento(m: SnapMemento) {
        (this.faces as SnapManager['faces']) = m.faces;
        (this.edges as SnapManager['edges']) = m.edges;
        (this.curves as SnapManager['curves']) = m.curves;
        (this.garbageDisposal as SnapManager['garbageDisposal']) = m.garbageDisposal;
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
priorities.set(CurveEdgeSnap, 2);
priorities.set(CurveSnap, 2);
priorities.set(FaceSnap, 3);
priorities.set(FacePointSnap, 3);
priorities.set(AxisSnap, 4);
priorities.set(PlaneSnap, 5);
priorities.set(ConstructionPlaneSnap, 6);

function sortIntersections(i1: THREE.Intersection, i2: THREE.Intersection) {
    const x = i1.object.userData.snap.priority ?? priorities.get(i1.object.userData.snap.constructor);
    const y = i2.object.userData.snap.priority ?? priorities.get(i2.object.userData.snap.constructor)
    if (x === undefined || y === undefined) {
        console.error(i1);
        console.error(i2);
        throw new Error("invalid precondition: " + `${i1.object.userData.snap.constructor}, ${i2.object.userData.snap.constructor.name}`);
    }
    return x - y;
}
