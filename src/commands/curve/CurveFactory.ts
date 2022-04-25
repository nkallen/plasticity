import * as THREE from "three";
import * as c3d from '../../kernel/kernel';
import { GeometryFactory, NoOpError, ValidationError } from '../../command/GeometryFactory';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from "../../editor/EditorSignals";
import MaterialDatabase from "../../editor/MaterialDatabase";
import { ConstructionPlane } from "../../editor/snaps/ConstructionPlaneSnap";
import { CurveEdgeSnap, EdgePointSnap, FaceCenterPointSnap, FaceSnap, TanTanSnap } from "../../editor/snaps/Snaps";
import { PlaneSnap } from "../../editor/snaps/PlaneSnap";
import { Snap } from "../../editor/snaps/Snap";
import { ContourAndPlacement, curve3d2curve2d, point2point } from "../../util/Conversion";

const curveMinimumPoints = new Map<c3d.SpaceType, number>();
curveMinimumPoints.set(c3d.SpaceType.Polyline3D, 2);
curveMinimumPoints.set(c3d.SpaceType.Hermit3D, 2);
curveMinimumPoints.set(c3d.SpaceType.Bezier3D, 2);
curveMinimumPoints.set(c3d.SpaceType.Nurbs3D, 4);
curveMinimumPoints.set(c3d.SpaceType.CubicSpline3D, 3);

export default class CurveFactory extends GeometryFactory {
    static async projectOntoConstructionSurface(curve: c3d.Curve3D, snap: Snap, constructionPlane?: ConstructionPlane): Promise<c3d.Curve3D> {
        // if (constructionPlane === undefined) return curve;

        // if (constructionPlane instanceof FaceConstructionPlaneSnap) {
        //     const face = constructionPlane.faceSnap.model;
        //     if (!face.IsPlanar()) {
        //         const surface = face.GetSurface().GetSurface();
        //         const projecteds = await c3d.ActionSurfaceCurve.CurveProjection_async(surface, curve, null, false, false);
        //         curve = projecteds[0];
        //         return curve;
        //     }
        //     return curve;
        // } else {
        //     return curve;
        // }
        if (curve.IsStraight(true)) {
            if (snap instanceof PlaneSnap || snap instanceof FaceSnap || snap instanceof FaceCenterPointSnap) {
                return this.projectOntoPlaneSnap(curve, snap) || this.projectOntoConstructionPlane(curve, constructionPlane);
            } else if (snap instanceof CurveEdgeSnap) {
                return this.projectOntoCurveEdgeSnap(curve, snap) || this.projectOntoConstructionPlane(curve, constructionPlane);
            } else if (snap instanceof EdgePointSnap) {
                return this.projectOntoCurveEdgeSnap(curve, snap.edgeSnap) || this.projectOntoConstructionPlane(curve, constructionPlane);
            } else {
                return this.projectOntoConstructionPlane(curve, constructionPlane);
            }
        } else {
            return curve;
        }
    }

    private static projectOntoCurveEdgeSnap(curve: c3d.Curve3D, snap: CurveEdgeSnap) {
        const planeSnaps = snap.planes;
        for (const snap of planeSnaps) {
            const result = this.projectOntoPlaneSnap(curve, snap);
            if (result !== undefined) return result;
        }
    }

    private static projectOntoPlaneSnap(curve: c3d.Curve3D, snap: PlaneSnap | FaceSnap | FaceCenterPointSnap) {
        let planarized: ContourAndPlacement | undefined;
        const hint = snap.placement;
        if (hint !== undefined) planarized = curve3d2curve2d(curve, hint, true);
        if (planarized !== undefined) {
            const { curve: curve2d, placement } = planarized;
            return new c3d.PlaneCurve(placement, curve2d, false);
        }
    }

    private static projectOntoConstructionPlane(curve: c3d.Curve3D, constructionPlane?: ConstructionPlane) {
        if (constructionPlane !== undefined) {
            let planarized = curve3d2curve2d(curve, constructionPlane.placement);
            if (planarized === undefined) return curve;
            const { curve: curve2d, placement } = planarized;
            return new c3d.PlaneCurve(placement, curve2d, false);
        } else {
            return curve;
        }
    }

    constructionPlane?: ConstructionPlane;

    readonly points = new Array<THREE.Vector3>();
    type = c3d.SpaceType.Hermit3D;
    closed = false;
    style = 0;

    get startPoint() { return this.points[0] }
    get otherPoints() { return this.points.slice(1) }

    async calculate() {
        const { points, type, style, snap } = this;

        if (!this.hasEnoughPoints) throw new ValidationError(`${points.length} points is too few points for ${c3d.SpaceType[type]}`);
        if (points.length === 2 && this.points[1].manhattanDistanceTo(this.startPoint) < 10e-6) throw new NoOpError();

        const cartPoints = points.map(p => point2point(p));
        let curve = c3d.ActionCurve3D.SplineCurve(cartPoints, this.closed, type);
        curve = await CurveFactory.projectOntoConstructionSurface(curve, snap, this.constructionPlane);

        const instance = new c3d.SpaceInstance(curve);
        instance.SetStyle(style);
        return instance;
    }

    get hasEnoughPoints() {
        const { type, points: { length } } = this;

        if (length === 0) return false;
        if (length === 1) return false;
        if (length < curveMinimumPoints.get(type)!) return false;
        return true;
    }

    wouldBeClosed(p: THREE.Vector3) {
        return this.points.length >= 2 && p.manhattanDistanceTo(this.startPoint) < 10e-6;
    }

    set last(point: THREE.Vector3) {
        this.points[this.points.length - 1] = point;
        if (this.wouldBeClosed(point)) this.closed = closed;
    }

    get last() {
        return this.points[this.points.length - 1];
    }

    push(point: THREE.Vector3) {
        this.points.push(point);
    }

    temp?: THREE.Vector3;
    private _snap!: Snap;
    get snap() { return this._snap }
    set snap(snap: Snap) {
        this._snap = snap;
        const points = this.points;
        if (points.length > 2) {
            this.temp = undefined;
            return;
        }
        if (snap instanceof TanTanSnap) {
            if (this.temp === undefined) this.temp = points[points.length - 2];
            points[points.length - 2] = snap.point1;
        } else if (this.temp !== undefined) {
            points[this.points.length - 2] = this.temp;
            this.temp = undefined;
        }
    }
}

export class CurveWithPreviewFactory extends GeometryFactory {
    readonly underlying = new CurveFactory(this.db, this.materials, this.signals);
    readonly preview = new CurveFactory(this.db, this.materials, this.signals);

    constructor(
        protected readonly db: DatabaseLike,
        protected readonly materials: MaterialDatabase,
        protected readonly signals: EditorSignals
    ) {
        super(db, materials, signals);
        this.preview.style = 1;
        this.preview.push(new THREE.Vector3());
    }

    set constructionPlane(constructionPlane: ConstructionPlane | undefined) {
        this.underlying.constructionPlane = constructionPlane;
        this.preview.constructionPlane = constructionPlane;
    }

    set type(t: c3d.SpaceType) {
        this.underlying.type = t;
        this.preview.type = t;
    }

    undo() {
        const { underlying, preview } = this;

        const last = preview.points.pop()!;
        preview.points.pop();
        preview.points.push(last);

        underlying.points.pop();
    }

    get canBeClosed() {
        return this.underlying.points.length >= 3;
    }

    get startPoint() { return this.underlying.startPoint }
    get otherPoints() { return this.underlying.otherPoints }

    wouldBeClosed(p: THREE.Vector3) {
        return this.underlying.wouldBeClosed(p);
    }

    set closed(c: boolean) {
        this.underlying.closed = c;
    }

    push(p: THREE.Vector3) {
        this.underlying.points.push(p);
        this.preview.last = p;
        this.preview.push(p.clone());
        this.preview.temp = undefined;
    }

    set snap(snap: Snap) {
        this.underlying.snap = snap;
    }

    async doUpdate() {
        const promises = [this.preview.update(), this.underlying.update()];
        await Promise.all(promises);
        return Promise.resolve([]);
    }

    doCommit() {
        return this.underlying.commit();
    }

    doCancel() {
        this.underlying.cancel();
        this.preview.cancel();
    }
}