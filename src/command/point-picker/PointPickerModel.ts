import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import CommandRegistry from '../../components/atom/CommandRegistry';
import { CrossPoint, CrossPointDatabase } from '../../editor/curves/CrossPointDatabase';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from '../../editor/EditorSignals';
import { ConstructionPlane } from "../../editor/snaps/ConstructionPlaneSnap";
import { AxisAxisCrossPointSnap, AxisCurveCrossPointSnap, AxisSnap, ChoosableSnap, CurveEdgeSnap, CurveEndPointSnap, CurveSnap, FaceCenterPointSnap, FaceSnap, LineAxisSnap, OrRestriction, PlaneSnap, PointAxisSnap, PointSnap, Restriction, Snap } from "../../editor/snaps/Snap";
import { inst2curve, point2point } from '../../util/Conversion';
import * as visual from "../../visual_model/VisualModel";
import { PointResult, SnapCollection } from './PointPicker';

const XYZ = [AxisSnap.X, AxisSnap.Y, AxisSnap.Z];
export type Choice = { snap: ChoosableSnap; info?: { position: THREE.Vector3, orientation: THREE.Quaternion }; sticky: boolean };
export type Choices = 'Normal' | 'Binormal' | 'Tangent' | 'x' | 'y' | 'z';
export type PreferenceMode = 'none' | 'weak' | 'strong';

export class PointPickerModel {
    private readonly pickedPointSnaps = new Array<PointResult>(); // Snaps inferred from points the user actually picked
    readonly straightSnaps = new Set(XYZ); // Snaps going straight off the last picked point
    private readonly otherAddedSnaps = new SnapCollection();
    private readonly disabled = new Set<Snap>();

    private _restriction?: Restriction;
    private readonly _restrictionSnaps = new Array<Snap>(); // Snap targets for the restrictions
    private restrictionPoint?: THREE.Vector3;
    private restrictionPlane?: PlaneSnap;

    private readonly originalCrosses: CrossPointDatabase;
    private crosses: CrossPointDatabase;

    constructor(
        private readonly db: DatabaseLike,
        originalCrosses: CrossPointDatabase,
        private readonly registry: CommandRegistry,
        private readonly signals: EditorSignals
    ) {
        this.originalCrosses = new CrossPointDatabase(originalCrosses);
        this.addAxisCrosses(AxisSnap.X, this.originalCrosses);
        this.addAxisCrosses(AxisSnap.Y, this.originalCrosses);
        this.addAxisCrosses(AxisSnap.Z, this.originalCrosses);
        this.crosses = new CrossPointDatabase(this.originalCrosses);
    }

    restrictionSnapsFor(): Snap[] {
        return this._restrictionSnaps;
    }

    restrictionFor(baseConstructionPlane: ConstructionPlane, isOrtho: boolean): Restriction | undefined {
        if (this._restriction === undefined && this.restrictionPoint !== undefined) {
            return baseConstructionPlane.move(this.restrictionPoint);
        } else if (this._restriction !== undefined && this.restrictionPoint !== undefined && !isOrtho) {
            return new OrRestriction([this._restriction, baseConstructionPlane.move(this.restrictionPoint)]);
        } else if (this._restriction !== undefined && this.restrictionPoint !== undefined && isOrtho) {
            return baseConstructionPlane.move(this.restrictionPoint);
        } else if (this._restriction === undefined && isOrtho) {
            return baseConstructionPlane;
        } else
            return this._restriction;
    }

    actualConstructionPlaneGiven(baseConstructionPlane: ConstructionPlane, isOrtho: boolean): ConstructionPlane {
        const { pickedPointSnaps, restrictionPoint } = this;
        let constructionPlane = baseConstructionPlane;
        if (this.restrictionPlane !== undefined) {
            constructionPlane = this.restrictionPlane;
        } else if (restrictionPoint !== undefined) {
            constructionPlane = constructionPlane.move(restrictionPoint);
        } else if (isOrtho && pickedPointSnaps.length > 0) {
            const last = pickedPointSnaps[pickedPointSnaps.length - 1];
            constructionPlane = constructionPlane.move(last.point);
        }
        return constructionPlane;
    }

    private snapsForLastPickedPoint = new SnapCollection();
    private activatedSnaps = new SnapCollection();
    private makeSnapsForPickedPoints(): void {
        const { pickedPointSnaps, straightSnaps, facePreferenceMode } = this;

        this.crosses = new CrossPointDatabase(this.originalCrosses);

        const results = new SnapCollection();
        if (pickedPointSnaps.length > 0) {
            FirstPoint: {
                if (facePreferenceMode !== 'none') {
                    const first = pickedPointSnaps[0];
                    const snap = first.info.snap;
                    const info = { position: first.point, orientation: first.info.orientation };
                    if (snap instanceof FaceSnap) {
                        this._preference = { snap, info };
                    } else if (snap instanceof FaceCenterPointSnap) {
                        this._preference = { snap: snap.faceSnap, info };
                    }
                }
            }
            LastPoint: {
                const last = pickedPointSnaps[pickedPointSnaps.length - 1];
                const lastSnap = last.info.snap;
                const lastOrientation = last.info.orientation;
                let work: Snap[] = [];
                let axes = [...straightSnaps];
                if (facePreferenceMode === 'strong') {
                    const rotated = axes.map(s => s.rotate(lastOrientation));
                    work = work.concat(new PointSnap(undefined, last.point).axes(rotated));
                } else if (facePreferenceMode === 'weak') {
                    const rotated = axes.map(s => s.rotate(lastOrientation));
                    const oriented = new PointSnap(undefined, last.point).axes(rotated);
                    for (const axis of oriented) {
                        if (isAxisAligned(axis)) continue;
                        else work.push(axis);
                    }
                    work = work.concat(new PointSnap(undefined, last.point).axes(axes));
                } else {
                    work = work.concat(new PointSnap(undefined, last.point).axes(axes));
                }
                work = work.concat(lastSnap.additionalSnapsFor(last.point));
                for (const snap of work) {
                    if (snap instanceof PointAxisSnap) { // Such as normal/binormal/tangent
                        this.addAxis(snap, results, []);
                    } else {
                        results.push(snap);
                    }
                }
            }
        }
        results.update();
        this.snapsForLastPickedPoint = results;
        this._activatedHelpers = [];
        this.activatedSnaps = new SnapCollection();
        this.dontActivateSameSnapTwice.clear();
        this.disabled.clear();
        if (this._choice !== undefined && !this._choice.sticky)
            this.choose(undefined);
        this.mutualSnaps.clear();
    }

    facePreferenceMode: PreferenceMode = 'none';
    private _preference?: { snap: FaceSnap; info?: { position: THREE.Vector3; orientation: THREE.Quaternion; }; };
    get preference() { return this._preference; }

    toggle(snap: Snap) {
        const { disabled } = this;
        if (disabled.has(snap))
            disabled.delete(snap);
        else
            disabled.add(snap);
    }

    isEnabled(snap: Snap): boolean {
        return !this.disabled.has(snap);
    }

    clearAddedSnaps() {
        this.otherAddedSnaps.clear();
    }

    addSnap(...snaps: Snap[]) {
        this.otherAddedSnaps.push(...snaps);
        this.otherAddedSnaps.update();
    }

    private counter = -1; // counter descends from -1 to avoid conflicting with objects in the geometry database
    private readonly cross2axis = new Map<c3d.SimpleName, AxisSnap>();
    private addAxisCrosses(axis: AxisSnap, into = this.crosses): Set<CrossPoint> {
        const counter = this.counter--;
        const crosses = into.add(counter, new c3d.Line3D(point2point(axis.o), point2point(axis.o.clone().add(axis.n))));
        this.cross2axis.set(counter, axis);
        return crosses;
    }

    private addAxis(axis: PointAxisSnap, into: SnapCollection, other: Snap[]) {
        into.push(axis); other.push(axis);
        const crosses = this.addAxisCrosses(axis);
        for (const cross of crosses) {
            if (cross.position.manhattanDistanceTo(axis.o) < 10e-3)
                continue;
            const antecedentAxis = this.cross2axis.get(cross.on2.id);
            if (antecedentAxis !== undefined) {
                into.push(new AxisAxisCrossPointSnap(cross, axis, antecedentAxis));
            } else {
                const { view, model } = this.db.lookupItemById(cross.on2.id);
                const curve = inst2curve(model)!;
                const curveSnap = new CurveSnap(view as visual.SpaceInstance<visual.Curve3D>, curve);
                into.push(new AxisCurveCrossPointSnap(cross, axis, curveSnap));
            }
        }
    }

    addAxesAt(point: THREE.Vector3, orientation = new THREE.Quaternion(), axisSnaps: Iterable<AxisSnap> = this.straightSnaps, into: SnapCollection = this.otherAddedSnaps, other: Snap[] = []) {
        const rotated = [];
        for (const snap of axisSnaps)
            rotated.push(snap.rotate(orientation));
        const axes = new PointSnap(undefined, point).axes(rotated);
        for (const axis of axes)
            this.addAxis(axis, into, other);
    }

    get snaps(): { disabled: Set<Snap>; snapsForLastPickedPoint: SnapCollection; activatedSnaps: SnapCollection; otherAddedSnaps: SnapCollection; } {
        const { disabled, snapsForLastPickedPoint, activatedSnaps, otherAddedSnaps } = this;
        return { disabled, snapsForLastPickedPoint, activatedSnaps, otherAddedSnaps };
    }

    restrictToPlaneThroughPoint(point: THREE.Vector3, snap?: Snap) {
        this.restrictionPoint = point;
        if (snap !== undefined) {
            this._restriction = snap.restrictionFor(point);
        }
    }

    restrictToPlane(plane: PlaneSnap) {
        this._restriction = plane;
        this.restrictionPlane = plane;
    }

    restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3) {
        const line = new LineAxisSnap(direction, origin);
        this._restriction = line;
        this._choice = { snap: line, sticky: false };
        this.choose(line, undefined, false);
        // FIXME: the user is able to hit shift and make this choice disappear, which is a bug; introduce another boolean?
    }

    restrictToEdges(edges: visual.CurveEdge[]): OrRestriction<CurveEdgeSnap> {
        const restrictions = [];
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge);
            const restriction = new CurveEdgeSnap(edge, model);
            // FIXME: this isn't used by snap picker, which is relying on all geometry. Not as efficient as it could be ...
            // this._restrictionSnaps.push(restriction);
            restrictions.push(restriction);
        }
        const restriction = new OrRestriction(restrictions);
        this._restriction = restriction;
        return restriction;
    }

    addPickedPoint(pointResult: PointResult) {
        this.pickedPointSnaps.push(pointResult);
        this.makeSnapsForPickedPoints();
    }

    private _choice?: Choice;
    get choice() { return this._choice; }
    choose(which: Choices | Snap | undefined, info?: { position: THREE.Vector3; orientation: THREE.Quaternion; }, sticky = false) {
        if (which === undefined) {
            this._choice = undefined;
        } else if (which instanceof Snap) {
            if (which instanceof AxisSnap || which instanceof FaceSnap)
                this._choice = { snap: which, info, sticky };
        } else {
            let chosen = this.snapsForLastPickedPoint.other.filter(s => s.name == which)[0] as AxisSnap | undefined;
            chosen ??= this.otherAddedSnaps.other.filter(s => s.name == which)[0] as AxisSnap | undefined;
            if (chosen !== undefined)
                this._choice = { snap: chosen, info, sticky };
        }
    }

    undo() {
        this.pickedPointSnaps.pop();
        this.makeSnapsForPickedPoints();
    }

    // Sometimes additional snaps are "activated" when the user mouses over an existing snap and hits shift
    private _activatedHelpers: Snap[] = [];
    get activatedHelpers(): readonly Snap[] { return this._activatedHelpers; }
    private readonly dontActivateSameSnapTwice = new Set<Snap>();

    activateSnapped(snaps: Snap[], viewportInfo: { isOrthoMode: boolean; constructionPlane: ConstructionPlane; }) {
        const { activatedSnaps, _activatedHelpers } = this;

        const quat = viewportInfo.isOrthoMode ? viewportInfo.constructionPlane.orientation : new THREE.Quaternion();
        for (const snap of snaps) {
            if (this.dontActivateSameSnapTwice.has(snap))
                continue;
            this.dontActivateSameSnapTwice.add(snap);

            if (snap instanceof CurveEndPointSnap) {
                this.addAxesAt(snap.position, quat, XYZ, activatedSnaps, _activatedHelpers);
                this.addAxis(snap.tangentSnap, activatedSnaps, _activatedHelpers);
            } else if (snap instanceof FaceCenterPointSnap) {
                this.addAxesAt(snap.position, quat, XYZ, activatedSnaps, _activatedHelpers);
                this.addAxis(snap.normalSnap, activatedSnaps, _activatedHelpers);
            } else if (snap instanceof PointSnap) {
                this.addAxesAt(snap.position, quat, XYZ, activatedSnaps, _activatedHelpers);
            }
        }
        activatedSnaps.update();
    }

    // Activate snaps like tan/tan and perp/perp which only make sense when the previously selected point and the
    // current nearby snaps match certain conditions.
    private readonly mutualSnaps = new Set<Snap>();
    activateMutualSnaps(nearby: Snap[]) {
        const { mutualSnaps, pickedPointSnaps } = this;
        if (pickedPointSnaps.length === 0) return;

        const last = pickedPointSnaps[pickedPointSnaps.length - 1];
        const lastPickedSnap = last.info.snap;
        if (lastPickedSnap === undefined) return;

        for (const snap of nearby) {
            if (mutualSnaps.has(snap)) continue;
            mutualSnaps.add(snap); // idempotent

            if (snap instanceof CurveSnap) {
                const additional = snap.additionalSnapsGivenPreviousSnap(last.point, lastPickedSnap);
                this.snapsForLastPickedPoint.push(...additional);
                this.snapsForLastPickedPoint.update();
            }
        }
    }
}

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export function isAxisAligned(axis: PointAxisSnap): boolean {
    const n = axis.n;
    return (Math.abs(n.dot(X)) > 1 - 10e-6) || (Math.abs(n.dot(Y)) > 1 - 10e-6) || (Math.abs(n.dot(Z)) > 1 - 10e-6)
}
