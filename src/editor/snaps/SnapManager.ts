import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import { cornerInfo, inst2curve, point2point, vec2vec } from "../../util/Conversion";
import * as visual from '../../visual_model/VisualModel';
import { CrossPointDatabase } from "../curves/CrossPointDatabase";
import { EditorSignals } from "../EditorSignals";
import { DatabaseLike } from "../DatabaseLike";
import { MementoOriginator, SnapMemento } from "../History";
import { AxisSnap, CircleCenterPointSnap, CrossPointSnap, CurveEdgeSnap, CurveEndPointSnap, CurvePointSnap, CurveSnap, EdgePointSnap, FaceCenterPointSnap, FaceSnap, CircularNurbsCenterPointSnap, PointSnap, Snap } from "./Snap";

export enum SnapType {
    Basic = 1 << 0,
    Geometry = 1 << 1,
    Crosses = 2 << 1,
}

export class SnapManager implements MementoOriginator<SnapMemento> {
    enabled = true;
    options: SnapType = SnapType.Basic | SnapType.Geometry | SnapType.Crosses;

    private readonly basicSnaps = new Set<Snap>();
    private readonly id2snaps = new Map<c3d.SimpleName, Set<PointSnap>>();
    private readonly hidden = new Map<c3d.SimpleName, Set<PointSnap>>()

    constructor(
        private readonly db: DatabaseLike,
        private readonly crosses: CrossPointDatabase,
        signals: EditorSignals
    ) {
        this.basicSnaps.add(originSnap);
        this.basicSnaps.add(xAxisSnap);
        this.basicSnaps.add(yAxisSnap);
        this.basicSnaps.add(zAxisSnap);
        Object.freeze(this.basicSnaps);

        signals.objectAdded.add(([item, agent]) => {
            if (agent === 'user') this.add(item);
        });
        signals.objectRemoved.add(([item, agent]) => {
            if (agent === 'user') this.delete(item);
        });
        signals.objectUnhidden.add(item => this.unhide(item));
        signals.objectHidden.add(item => this.hide(item));
    }

    get all(): { basicSnaps: Set<Snap>, geometrySnaps: readonly Set<PointSnap>[], crossSnaps: readonly CrossPointSnap[] } {
        const { id2snaps } = this;
        const geometrySnaps = (this.options & SnapType.Geometry) === SnapType.Geometry ? [...id2snaps.values()] : [];
        const basicSnaps = (this.options & SnapType.Basic) === SnapType.Basic ? this.basicSnaps : new Set<Snap>();
        const crossSnaps = (this.options & SnapType.Crosses) === SnapType.Crosses ? this.crossSnaps : [];
        return { basicSnaps, geometrySnaps, crossSnaps }
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
        const snapsForItem = new Set<PointSnap>();
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
    }

    private addFace(view: visual.Face, model: c3d.Face, into: Set<Snap>) {
        const faceSnap = new FaceSnap(view, model);
        const centerSnap = new FaceCenterPointSnap(point2point(model.Point(0.5, 0.5)), vec2vec(model.Normal(0.5, 0.5), 1), faceSnap);
        into.add(centerSnap);
    }

    private addEdge(view: visual.CurveEdge, model: c3d.CurveEdge, into: Set<Snap>) {
        const edgeSnap = new CurveEdgeSnap(view, model);
        const begPt = point2point(model.GetBegPoint());
        const endPt = point2point(model.GetEndPoint());
        const midPt = point2point(model.Point(0.5));
        const begTau = vec2vec(model.GetBegTangent(), 1);
        const endTau = vec2vec(model.GetEndTangent(), 1);
        const midTau = vec2vec(model.Tangent(0.5), 1);
        const begSnap = new EdgePointSnap("Beginning", begPt, begTau, edgeSnap);
        const endSnap = new EdgePointSnap("End", endPt, endTau, edgeSnap);
        const midSnap = new EdgePointSnap("Middle", midPt, midTau, edgeSnap);

        const underlying = model.GetSpaceCurve();
        if (underlying !== null) {
            if (underlying.IsA() === c3d.SpaceType.Arc3D) {
                const cast = underlying.Cast<c3d.Arc3D>(underlying.IsA());
                const centerSnap = new CircleCenterPointSnap(cast, view);
                into.add(centerSnap);

                const quartPt = point2point(model.Point(0.25));
                const threeQuartPt = point2point(model.Point(0.75));
                const quartTau = vec2vec(model.Tangent(0.25), 1);
                const threeQuartTau = vec2vec(model.Tangent(0.75), 1);

                const quarter = new EdgePointSnap("1/4", quartPt, quartTau, edgeSnap);
                const threeQuarter = new EdgePointSnap("3/4", threeQuartPt, threeQuartTau, edgeSnap);
                into.add(quarter);
                into.add(threeQuarter);
            } else if (underlying.IsA() === c3d.SpaceType.Nurbs3D) {
                const cast = underlying.Cast<c3d.Nurbs3D>(c3d.SpaceType.Nurbs3D);
                const { success, axis } = cast.GetCircleAxis();
                if (success && cast.IsPlanar()) {
                    const center = point2point(axis.GetOrigin());
                    const z = vec2vec(axis.GetAxisZ(), 1);
                    const centerSnap = new CircularNurbsCenterPointSnap(center, z, view);
                    into.add(centerSnap);
                }
            }
        }

        into.add(begSnap);
        into.add(midSnap);
        into.add(endSnap);
    }

    private addCurve(view: visual.SpaceInstance<visual.Curve3D>, into: Set<Snap>) {
        const inst = this.db.lookup(view);
        const item = inst2curve(inst)!;
        this.crosses.add(view.simpleName, item);

        const curveSnap = new CurveSnap(view, item);
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
            const begPt = item.GetLimitPoint(1);
            const beg = new CurveEndPointSnap("Beginning", point2point(begPt), curveSnap, item.NearPointProjection(begPt, false).t)
            into.add(beg);

            const endPt = item.GetLimitPoint(2);
            const end = new CurveEndPointSnap("End", point2point(endPt), curveSnap, item.NearPointProjection(endPt, false).t)
            into.add(end);
        } else if (item instanceof c3d.Arc3D) {
            const zeroPt = point2point(item.PointOn(0));
            const quartPt = point2point(item.PointOn(2 * Math.PI / 4));
            const halfPt = point2point(item.PointOn(Math.PI));
            const threeQuartPt = point2point(item.PointOn(Math.PI * 3 / 2));
            const zeroSnap = new CurvePointSnap("zero", zeroPt, curveSnap, item.NearPointProjection(point2point(zeroPt), false).t);
            const quartSnap = new CurvePointSnap("1/4", quartPt, curveSnap, item.NearPointProjection(point2point(quartPt), false).t);
            const halfSnap = new CurvePointSnap("1/2", halfPt, curveSnap, item.NearPointProjection(point2point(halfPt), false).t);
            const threeQuartSnap = new CurvePointSnap("3/4", threeQuartPt, curveSnap, item.NearPointProjection(point2point(threeQuartPt), false).t);
            into.add(zeroSnap);
            into.add(quartSnap);
            into.add(halfSnap);
            into.add(threeQuartSnap);
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

    private delete(item: visual.Item) {
        this.id2snaps.delete(item.simpleName);
        if (item instanceof visual.SpaceInstance) this.crosses.remove(item.simpleName);
    }

    private hide(item: visual.Item) {
        const id = item.simpleName;
        const info = this.id2snaps.get(id)!;
        this.id2snaps.delete(id);
        this.hidden.set(id, info);
    }

    private unhide(item: visual.Item) {
        const id = item.simpleName;
        const info = this.hidden.get(id)!;
        this.id2snaps.set(id, info);
        this.hidden.delete(id);
    }

    saveToMemento(): SnapMemento {
        return new SnapMemento(
            new Map(this.id2snaps),
            new Map(this.hidden));
    }

    restoreFromMemento(m: SnapMemento) {
        (this.id2snaps as SnapManager['id2snaps']) = m.id2snaps;
        (this.hidden as SnapManager['hidden']) = m.hidden;
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
export const xAxisSnap = new AxisSnap("X", new THREE.Vector3(1, 0, 0));
export const yAxisSnap = new AxisSnap("Y", new THREE.Vector3(0, 1, 0));
export const zAxisSnap = new AxisSnap("Z", new THREE.Vector3(0, 0, 1));
