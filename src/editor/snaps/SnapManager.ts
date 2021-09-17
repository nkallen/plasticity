import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import c3d from '../../../build/Release/c3d.node';
import { GizmoMaterialDatabase } from "../../commands/GizmoMaterials";
import { point2point, vec2vec } from "../../util/Conversion";
import { Helper, SimpleHelper } from "../../util/Helpers";
import { CircleGeometry, Redisposable, RefCounter } from "../../util/Util";
import { EditorSignals } from "../EditorSignals";
import { DatabaseLike } from "../GeometryDatabase";
import { MementoOriginator, SnapMemento } from "../History";
import * as visual from '../VisualModel';
import { AxisSnap, ConstructionPlaneSnap, CurveEdgeSnap, CurveSnap, FaceSnap, PlaneSnap, PointSnap, Restriction, Snap } from "./Snap";

const discGeometry = new THREE.CircleGeometry(0.05, 16);
const circleGeometry = new LineGeometry();
circleGeometry.setPositions(CircleGeometry(0.1, 16));

export interface SnapResult {
    snap: Snap;
    position: THREE.Vector3;
    indicator: Helper;
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
        signals.objectUnhidden.add(item => this.add(item));
        signals.objectHidden.add(item => this.delete(item));

        this.layers.enableAll();

        this.update();
    }

    nearby(raycaster: THREE.Raycaster, additional: Snap[] = [], restrictions: Restriction[] = []): Helper[] {
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

        const centerSnap = new PointSnap("Center", point2point(model.Point(0.5, 0.5)), vec2vec(model.Normal(0.5, 0.5), 1));
        this.centerPoints.add(centerSnap);

        return new Redisposable(() => {
            this.faces.delete(faceSnap);
            this.centerPoints.delete(centerSnap);
        });
    }

    private addEdge(edge: visual.CurveEdge, model: c3d.CurveEdge): Redisposable {
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new PointSnap("Beginning", point2point(begPt));
        const midSnap = new PointSnap("Middle", point2point(midPt));

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

        if (item_.IsA() === c3d.SpaceType.Polyline3D) {
            const polyline = item_.Cast<c3d.Polyline3D>(c3d.SpaceType.Polyline3D);
            const points = polyline.GetPoints();
            const endSnaps = points.map(point =>
                new PointSnap("End", point2point(point))
            );
            for (const endSnap of endSnaps) this.endPoints.add(endSnap);

            const curveSnap = new CurveSnap(item, polyline);
            this.curves.add(curveSnap);

            return new Redisposable(() => {
                for (const endSnap of endSnaps) this.endPoints.delete(endSnap);
                this.curves.delete(curveSnap);
            });
        } else {
            const curve = item_.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
            const min = curve.PointOn(curve.GetTMin());
            const mid = curve.PointOn(0.5 * (curve.GetTMin() + curve.GetTMax()));
            const max = curve.PointOn(curve.GetTMax());
            const begSnap = new PointSnap("Beginning", point2point(min));
            const midSnap = new PointSnap("Middle", point2point(mid));
            const endSnap = new PointSnap("End", point2point(max));
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
    }

    private delete(item: visual.Item): void {
        this.garbageDisposal.delete(item.simpleName);
        this.update();
    }

    private hoverIndicatorFor(intersection: THREE.Intersection): Helper {
        const disc = new SimpleHelper(new THREE.Mesh(discGeometry, this.materials.black.hover.mesh));

        const snap = intersection.object.userData.snap as Snap;
        const { position, orientation } = snap.project(intersection);
        disc.position.copy(position);
        disc.quaternion.copy(orientation);
        return disc;
    }

    private snapIndicatorFor(intersection: THREE.Intersection): Helper {
        const circle = new SimpleHelper(new Line2(circleGeometry, this.materials.black.line2));

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

    debug() {
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
