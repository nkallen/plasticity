import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { GPUPicker } from "../../components/viewport/gpu_picking/GPUPicker";
import { cornerInfo, inst2curve, point2point, vec2vec } from "../../util/Conversion";
import { CrossPointDatabase } from "../curves/CrossPointDatabase";
import { EditorSignals } from "../EditorSignals";
import { DatabaseLike } from "../GeometryDatabase";
import { MementoOriginator, SnapMemento } from "../History";
import * as visual from '../VisualModel';
import { AxisSnap, CrossPointSnap, CurveEndPointSnap, CurvePointSnap, CurveSnap, EdgeEndPointSnap, EdgePointSnap, FaceCenterPointSnap, FaceSnap, PointSnap, Restriction, Snap } from "./Snap";

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

        this.refresh();
    }

    // FIXME should nearbys only be points?
    nearby(picker: GPUPicker, additional: Snap[] = [], restrictions: Restriction[] = []): SnapResult[] {
        if (!this.shouldSnap) return [];
        performance.mark('begin-nearby');

        const additionalNearbys = [];
        for (const a of additional) if (a.nearby !== undefined) additionalNearbys.push(a.nearby);
        const nearbys = [...this.nearbys, ...additionalNearbys];

        picker.layers = this.layers;
        // const intersections = picker.intersectObjects(nearbys);
        return []; // FIXME
        // const result = [];
        // for (const intersection of intersections) {
        //     if (!this.satisfiesRestrictions(intersection.object.position, restrictions)) continue;
        //     const snap = intersection.object.userData.snap as Snap;
        //     const { position, orientation } = snap.project(intersection);
        //     result.push({ snap, position, orientation });
        // }
        // performance.measure('nearby', 'begin-nearby');
        // return result;
    }

    snap(picker: GPUPicker, additional: Snap[] = [], restrictionSnaps: Snap[] = [], restrictions: Restriction[] = [], isXRay: boolean = true): SnapResult[] {
        performance.mark('begin-snap');
        // NOTE: restriction snaps, including the construction plane, are always snappable
        let snappers = restrictionSnaps.map(a => a.snapper);
        if (this.shouldSnap) {
            snappers = snappers.concat([...this.snappers, ...additional.map(a => a.snapper)]);
        }
        snappers = [...new Set(snappers)];

        picker.layers = this.layers;
        const snapperIntersections = picker.intersect();
        const result: SnapResult[] = [];
        return result;

        // for (const intersection of snapperIntersections) {
        //     const snap = intersection.object.userData.snap as Snap;
        //     const { position, orientation } = snap.project(intersection);
        //     if (!this.satisfiesRestrictions(position, restrictions)) continue;
        //     result.push({ snap, position, orientation });
        // }
        // performance.measure('snap', 'begin-snap');
        return result;
    }

    private satisfiesRestrictions(point: THREE.Vector3, restrictions: Restriction[]): boolean {
        for (const restriction of restrictions) {
            if (!restriction.isValid(point)) return false;
        }
        return true;
    }

    get all() {
        let all = [...this.basicSnaps, ...this.crossSnaps];
        for (const snaps of this.id2snaps.values()) all = all.concat([...snaps]);
        return all;
    }

    private refresh() {
        const all = this.all;
        performance.mark('begin-snap-update');
        this.nearbys = all.map((s) => s.nearby).filter(x => !!x) as THREE.Object3D[];
        this.snappers = all.map((s) => s.snapper);
        performance.measure('snap-update', 'begin-snap-update');
    }

    get crossSnaps(): CrossPointSnap[] {
        return [...this.crosses.crosses].map(cross => {
            const { view: view1, model: model1 } = this.db.lookupItemById(cross.on1.id);
            const curve1 = inst2curve(model1)!;
            const curveSnap1 = new CurveSnap(view1 as visual.SpaceInstance<visual.Curve3D>, curve1);
            const { view: view2, model: model2 } = this.db.lookupItemById(cross.on2.id);
            const curve2 = inst2curve(model2)!;
            const curveSnap2 = new CurveSnap(view2 as visual.SpaceInstance<visual.Curve3D>, curve2);

            return new CrossPointSnap(cross, curveSnap1, curveSnap2);
        });
    }

    private add(item: visual.Item) {
        performance.mark('begin-snap-add');
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
        this.refresh();
    }

    private addFace(face: visual.Face, model: c3d.Face, into: Set<Snap>) {
        const faceSnap = new FaceSnap(face, model);
        const centerSnap = new FaceCenterPointSnap(point2point(model.Point(0.5, 0.5)), vec2vec(model.Normal(0.5, 0.5), 1), faceSnap);
        into.add(centerSnap);
    }

    private addEdge(edge: visual.CurveEdge, model: c3d.CurveEdge, into: Set<Snap>) {
        const begPt = model.GetBegPoint();
        const midPt = model.Point(0.5);
        const begSnap = new EdgeEndPointSnap("Beginning", point2point(begPt));
        const midSnap = new EdgePointSnap("Middle", point2point(midPt));

        const underlying = model.GetSpaceCurve();
        if (underlying !== null) {
            if (underlying.IsA() === c3d.SpaceType.Arc3D) {
                const cast = underlying.Cast<c3d.Arc3D>(underlying.IsA());
                const centerSnap = new PointSnap("Center", point2point(cast.GetCentre()))
                into.add(centerSnap);
            }
        }

        into.add(begSnap);
        into.add(midSnap);
    }

    private addCurve(view: visual.SpaceInstance<visual.Curve3D>, into: Set<Snap>) {
        const inst = this.db.lookup(view);
        const item = inst2curve(inst)!;
        this.crosses.add(view.simpleName, item);

        const curveSnap = new CurveSnap(view, item);
        into.add(curveSnap);
        if (item instanceof c3d.Polyline3D) {

            const points = item.GetPoints();
            const endSnaps = points.map(point =>
                new CurveEndPointSnap("End", point2point(point), curveSnap, item.NearPointProjection(point, false).t)
            );
            for (const endSnap of endSnaps) into.add(endSnap);

            const first = point2point(points.shift()!);
            let prev = first;
            const mid = new THREE.Vector3();
            const midSnaps: CurvePointSnap[] = [];
            for (const point of points) {
                const current = point2point(point);
                mid.copy(prev).add(current).multiplyScalar(0.5);
                const midSnap = new CurvePointSnap("Mid", mid, curveSnap, item.NearPointProjection(point2point(mid), false).t);
                midSnaps.push(midSnap);
                prev = current;
            }
            if (item.IsClosed()) {
                const current = first;
                mid.copy(prev).add(current).multiplyScalar(0.5);
                const midSnap = new CurvePointSnap("Mid", mid, curveSnap, item.NearPointProjection(point2point(mid), false).t);
                midSnaps.push(midSnap);
            }
            for (const midSnap of midSnaps) into.add(midSnap);
        } else if (item instanceof c3d.Contour3D) {
            const corners = cornerInfo(item);
            const joints = [];
            for (const [, info] of corners) {
                const point = info.origin;
                const snap = new CurveEndPointSnap("End", point, curveSnap, item.NearPointProjection(point2point(point), false).t)
                joints.push(snap);
            }
            for (const endSnap of joints) into.add(endSnap);
            const segments = item.GetSegments();
            for (const [i, segment] of segments.entries()) {
                const cast = segment.Cast<c3d.Curve3D>(segment.IsA());
                if (cast instanceof c3d.Polyline3D) {
                    const points = cast.GetPoints();
                    if (i > 0) points.shift(); // First and (potentially) last would be a joint
                    if (i < segments.length - 1) points.pop();
                    const endSnaps = points.map(point =>
                        new CurveEndPointSnap("End", point2point(point), curveSnap, item.NearPointProjection(point, false).t)
                    );
                    for (const endSnap of endSnaps) into.add(endSnap);
                }
            }
            const point = item.GetLimitPoint(2);
            const final = new CurveEndPointSnap("End", point2point(point), curveSnap, item.NearPointProjection(point, false).t)
            into.add(final);
        } else {
            if (item.IsClosed()) return;

            const min = item.PointOn(item.GetTMin());
            const mid = item.PointOn(0.5 * (item.GetTMin() + item.GetTMax()));
            const max = item.PointOn(item.GetTMax());
            const begSnap = new CurveEndPointSnap("Beginning", point2point(min), curveSnap, item.GetTMin());
            const midSnap = new CurveEndPointSnap("Middle", point2point(mid), curveSnap, 0.5 * (item.GetTMin() + item.GetTMax()));
            const endSnap = new CurveEndPointSnap("End", point2point(max), curveSnap, item.GetTMax());
            into.add(begSnap);
            if (item.IsStraight()) into.add(midSnap);
            into.add(endSnap);
        }
    }

    private delete(item: visual.Item): void {
        this.id2snaps.delete(item.simpleName);
        if (item instanceof visual.SpaceInstance) this.crosses.remove(item.simpleName);
        this.refresh();
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
        this.refresh();
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
