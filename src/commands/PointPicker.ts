import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import CommandRegistry from '../components/atom/CommandRegistry';
import { OrbitControls } from '../components/viewport/OrbitControls';
import { Viewport } from '../components/viewport/Viewport';
import { CrossPoint, CrossPointDatabase } from '../editor/curves/CrossPointDatabase';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import LayerManager from '../editor/LayerManager';
import { AxisAxisCrossPointSnap, AxisCurveCrossPointSnap, AxisSnap, CurveEdgeSnap, CurveEndPointSnap, CurvePointSnap, CurveSnap, FaceCenterPointSnap, LineSnap, OrRestriction, PlaneSnap, PointAxisSnap, PointSnap, Restriction, Snap } from "../editor/snaps/Snap";
import { SnapManager } from '../editor/snaps/SnapManager';
import { SnapPresenter } from '../editor/snaps/SnapPresenter';
import { CancellablePromise } from '../util/Cancellable';
import { inst2curve, point2point } from '../util/Conversion';
import { Helper, Helpers } from '../util/Helpers';
import { SnapManagerGeometryCache, SnapPicker, SnapResult } from '../visual_model/SnapPicker';
import * as visual from "../visual_model/VisualModel";

const pointGeometry = new THREE.SphereGeometry(0.03, 8, 6, 0, Math.PI * 2, 0, Math.PI);

export interface EditorLike {
    db: DatabaseLike,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals,
    helpers: Helpers,
    snapPresenter: SnapPresenter,
    crosses: CrossPointDatabase,
    registry: CommandRegistry,
    layers: LayerManager,
}

export type PointInfo = { constructionPlane: PlaneSnap, snap: Snap }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

type Choices = 'Normal' | 'Binormal' | 'Tangent' | 'x' | 'y' | 'z';

export class Model {
    private readonly pickedPointSnaps = new Array<PointResult>(); // Snaps inferred from points the user actually picked
    straightSnaps = new Set([AxisSnap.X, AxisSnap.Y, AxisSnap.Z]); // Snaps going straight off the last picked point
    private readonly otherAddedSnaps = new Array<Snap>();

    private readonly restrictions = new Array<Restriction>();
    private readonly _restrictionSnaps = new Array<Snap>(); // Snap targets for the restrictions
    restrictToConstructionPlane = false;
    private restrictionPoint?: THREE.Vector3;
    restrictionPlane?: PlaneSnap;

    private crosses: CrossPointDatabase;

    constructor(
        private readonly db: DatabaseLike,
        private readonly originalCrosses: CrossPointDatabase,
        private readonly registry: CommandRegistry,
        private readonly signals: EditorSignals,
    ) {
        this.crosses = new CrossPointDatabase(originalCrosses);
    }

    snapsFor(constructionPlane: PlaneSnap, isOrtho: boolean): Snap[] {
        const result = [...this.snaps];
        result.push(this.actualConstructionPlaneGiven(constructionPlane, isOrtho));
        return result;
    }

    get restrictionSnaps(): Snap[] {
        return this._restrictionSnaps;
    }

    actualConstructionPlaneGiven(baseConstructionPlane: PlaneSnap, isOrtho: boolean) {
        const { pickedPointSnaps, restrictionPlane, restrictionPoint } = this;
        let constructionPlane = baseConstructionPlane;
        if (restrictionPlane !== undefined) {
            constructionPlane = restrictionPlane;
        } else if (restrictionPoint !== undefined) {
            constructionPlane = constructionPlane.move(restrictionPoint);
        } else if (isOrtho && pickedPointSnaps.length > 0) {
            const last = pickedPointSnaps[pickedPointSnaps.length - 1];
            constructionPlane = constructionPlane.move(last.point);
        }
        return constructionPlane;
    }

    private snapsForLastPickedPoint: Snap[] = [];
    private makeSnapsForLastPickedPoint(): void {
        const { pickedPointSnaps, straightSnaps } = this;

        this.crosses = new CrossPointDatabase(this.originalCrosses);

        let results: Snap[] = [];
        if (pickedPointSnaps.length > 0) {
            const last = pickedPointSnaps[pickedPointSnaps.length - 1];
            results = results.concat(new PointSnap(undefined, last.point).axes(straightSnaps));
            results = results.concat(last.info.snap.additionalSnapsFor(last.point));
            for (const result of results) {
                if (result instanceof PointAxisSnap) { // Such as normal/binormal/tangent
                    this.addAxis(result, this.snapsForLastPickedPoint);
                }
            }
        }
        this.snapsForLastPickedPoint = results;
        this.activatedSnaps.clear();
        this.choice = undefined;
        this.mutualSnaps.clear();
    }

    start() {
        this.registerKeybindingFor(...this.otherAddedSnaps, ...this.snapsForLastPickedPoint);
        return new Disposable(() => this.clearKeybindingFor(...this.otherAddedSnaps, ...this.snapsForLastPickedPoint));
    }

    registerKeyboardCommands(domElement: HTMLElement, fn: () => void) {
        const choose = (which: Choices) => {
            this.choose(which);
            fn();
        }

        const disposable = new CompositeDisposable();
        for (const snap of [...this.otherAddedSnaps, ...this.snapsForLastPickedPoint]) {
            if (snap instanceof PointAxisSnap) {
                const d = this.registry.addOne(domElement, snap.commandName, _ => choose(snap.name as Choices));
                disposable.add(d);
            }
        }
        return disposable;
    }

    private registerKeybindingFor(...snaps: Snap[]) {
        for (const snap of snaps) {
            if (snap instanceof PointAxisSnap) {
                this.signals.keybindingsRegistered.dispatch([snap.commandName]);
            }
        }
    }

    private clearKeybindingFor(...snaps: Snap[]) {
        for (const snap of snaps) {
            if (snap instanceof PointAxisSnap) {
                this.signals.keybindingsCleared.dispatch([snap.commandName]);
            }
        }
    }

    clearAddedSnaps() {
        this.otherAddedSnaps.length = 0;
    }

    addSnap(...snaps: Snap[]) {
        this.otherAddedSnaps.push(...snaps);
    }

    private counter = -1; // counter descends from -1 to avoid conflicting with objects in the geometry database
    private readonly cross2axis = new Map<c3d.SimpleName, AxisSnap>();
    private addAxisCrosses(axis: AxisSnap): Set<CrossPoint> {
        const counter = this.counter--;
        const crosses = this.crosses.add(counter, new c3d.Line3D(point2point(axis.o), point2point(axis.o.clone().add(axis.n))));
        this.cross2axis.set(counter, axis);
        return crosses;
    }

    private addAxis(axis: PointAxisSnap, into: Snap[]) {
        into.push(axis);
        const crosses = this.addAxisCrosses(axis);
        for (const cross of crosses) {
            if (cross.position.manhattanDistanceTo(axis.o) < 10e-3) continue;
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

    addAxesAt(point: THREE.Vector3, orientation = new THREE.Quaternion(), into: Snap[] = this.otherAddedSnaps) {
        const rotated = [];
        for (const snap of this.straightSnaps) rotated.push(snap.rotate(orientation));
        const axes = new PointSnap(undefined, point).axes(rotated);
        for (const axis of axes) this.addAxis(axis, into);
    }

    get snaps() {
        return this.snapsForLastPickedPoint.concat(this.otherAddedSnaps);
    }

    restrictToPlaneThroughPoint(point: THREE.Vector3) {
        this.restrictionPoint = point;
    }

    restrictToPlane(plane: PlaneSnap) {
        this.restrictionPlane = plane;
    }

    restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3) {
        const line = LineSnap.make(undefined, direction, origin);
        this.restrictions.push(line);
        this._restrictionSnaps.push(line);
    }

    restrictToEdges(edges: visual.CurveEdge[]): OrRestriction<CurveEdgeSnap> {
        const restrictions = [];
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge);
            const restriction = new CurveEdgeSnap(edge, model);
            this._restrictionSnaps.push(restriction);
            restrictions.push(restriction);
        }
        const restriction = new OrRestriction(restrictions);
        this.restrictions.push(restriction);
        return restriction;
    }

    restrictToCurves(curves: visual.SpaceInstance<visual.Curve3D>[]) {
        const restrictions = [];
        for (const curve of curves) {
            const inst = this.db.lookup(curve);
            const item = inst.GetSpaceItem()!;
            const model = item.Cast<c3d.Curve3D>(item.IsA());
            const restriction = new CurveSnap(curve, model);
            this._restrictionSnaps.push(restriction);
            restrictions.push(restriction);
        }
        const restriction = new OrRestriction(restrictions);
        this.restrictions.push(restriction);
        return restriction;
    }

    addPickedPoint(pointResult: PointResult) {
        this.pickedPointSnaps.push(pointResult);
        this.makeSnapsForLastPickedPoint();
    }

    choice?: AxisSnap;
    choose(which: Choices | Snap | undefined) {
        if (which instanceof Snap) {
            if (which instanceof AxisSnap) this.choice = which;
        } else {
            let chosen = this.snapsForLastPickedPoint.filter(s => s.name == which)[0] as AxisSnap | undefined;
            chosen ??= this.otherAddedSnaps.filter(s => s.name == which)[0] as AxisSnap | undefined;
            if (chosen !== undefined) this.choice = chosen;
        }
    }

    undo() {
        this.pickedPointSnaps.pop();
        this.makeSnapsForLastPickedPoint();
    }

    // Sometimes additional snaps are "activated" when the user mouses over an existing snap
    private readonly activatedSnaps = new Set<Snap>();
    activateSnapped(snaps: Snap[]) {
        for (const snap of snaps) {
            if (this.activatedSnaps.has(snap)) continue;
            this.activatedSnaps.add(snap); // idempotent

            if (snap instanceof CurvePointSnap && !snap.model.IsClosed()) {
                this.addAxesAt(snap.position, new THREE.Quaternion(), this.snapsForLastPickedPoint);
            }
            if (snap instanceof FaceCenterPointSnap) {
                this.addAxesAt(snap.position, new THREE.Quaternion(), this.snapsForLastPickedPoint);
            }
            if (snap instanceof CurveEndPointSnap && !snap.model.IsClosed()) {
                this.addAxis(snap.tangentSnap, this.snapsForLastPickedPoint)
            }
        }
    }

    // FIXME: verify this is working
    // Activate snaps like tan/tan and perp/perp which only make sense when the previously selected point and the
    // current nearby snaps match certain conditions.
    private readonly mutualSnaps = new Set<Snap>();
    activateMutualSnaps(nearby: SnapResult[]) {
        const { mutualSnaps: pointActivatedSnaps, pickedPointSnaps } = this;
        if (pickedPointSnaps.length === 0) return;

        const last = pickedPointSnaps[pickedPointSnaps.length - 1];
        const lastPickedSnap = last.info.snap;
        if (lastPickedSnap === undefined) return;

        for (const { snap } of nearby) {
            if (pointActivatedSnaps.has(snap)) continue;
            pointActivatedSnaps.add(snap); // idempotent

            if (snap instanceof CurveSnap) {
                const additional = snap.additionalSnapsForLast(last.point, lastPickedSnap);
                this.addSnap(...additional);
            }
        }
    }
}

interface SnapInfo extends PointInfo {
    position: THREE.Vector3;
}

// This is a presentation or template class that contains all info needed to show "nearby" and "snap" points to the user
// There are icons, indicators, textual name explanations, etc.
export class Presentation {
    static make(picker: SnapPicker, viewport: Viewport, pointPicker: Model, snaps: SnapManager, presenter: SnapPresenter) {
        const { constructionPlane, isOrtho } = viewport;

        const nearby = picker.nearby();
        const snappers = picker.intersect(pointPicker);
        const actualConstructionPlaneGiven = pointPicker.actualConstructionPlaneGiven(constructionPlane, isOrtho);

        const presentation = new Presentation(nearby, snappers, actualConstructionPlaneGiven, isOrtho, presenter);
        return { presentation, snappers, nearby };
    }

    readonly helpers: THREE.Object3D[];
    readonly info?: SnapInfo;
    readonly names: string[];
    readonly nearby: Helper[];

    constructor(nearby: PointSnap[], snaps: SnapResult[], constructionPlane: PlaneSnap, isOrtho: boolean, presenter: SnapPresenter) {
        this.nearby = nearby.map(n => presenter.nearbyIndicatorFor(n));

        if (snaps.length === 0) {
            this.names = [];
            this.helpers = [];
            return;
        }

        // First match is assumed best
        const first = snaps[0];
        const { snap, position } = first;
        const indicator = presenter.snapIndicatorFor(first);

        // Collect indicators, etc. as feedback for the user
        const helpers = [];
        helpers.push(indicator);
        const snapHelper = snap.helper;
        if (snapHelper !== undefined) helpers.push(snapHelper);
        this.helpers = helpers;

        this.info = { snap, position, constructionPlane };

        // Collect names of other matches to display to user
        let names = [];
        const pos = first.position;
        for (const { snap, position } of new Set(snaps)) {
            if (position.manhattanDistanceTo(pos) > 10e-6) continue;
            names.push(snap.name);
        }
        names = names.filter(x => x !== undefined);
        this.names = [...new Set(names as string[])].sort();
    }
}

export class PointTarget extends Helper {
    private readonly mesh = new THREE.Mesh(pointGeometry, new THREE.MeshStandardMaterial());

    constructor() {
        super();
        this.add(this.mesh);
    }
}

export class PointPicker {
    private readonly model = new Model(this.editor.db, this.editor.crosses, this.editor.registry, this.editor.signals);
    private readonly helper = new PointTarget();

    // FIXME: ensure passed to GPUPicker
    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 20 },
        Points: { threshold: 1 }
    };

    constructor(private readonly editor: EditorLike) { }

    execute<T>(cb?: (pt: PointResult) => T): CancellablePromise<PointResult> {
        return new CancellablePromise((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const { helper: pointTarget, editor, model } = this;

            disposables.add(model.start());

            document.body.setAttribute("gizmo", "point-picker");
            disposables.add(new Disposable(() => document.body.removeAttribute('gizmo')));

            editor.helpers.add(pointTarget);
            disposables.add(new Disposable(() => editor.helpers.remove(pointTarget)));
            disposables.add(new Disposable(() => editor.signals.snapped.dispatch(undefined)));
            const helpers = new THREE.Scene();

            let info: SnapInfo | undefined = undefined;
            console.time();
            const snapCache = new SnapManagerGeometryCache(editor.snaps);
            console.timeEnd();
            disposables.add(new Disposable(() => snapCache.dispose));

            for (const viewport of this.editor.viewports) {
                viewport.disableControls(viewport.navigationControls);
                disposables.add(new Disposable(() => viewport.enableControls()));

                let isNavigating = false;
                disposables.add(this.disablePickingDuringNavigation(viewport.navigationControls,
                    () => isNavigating = true,
                    () => isNavigating = false));

                const { camera, renderer: { domElement } } = viewport;
                const picker = new SnapPicker(this.editor.layers, snapCache, viewport, this.editor.db);

                viewport.additionalHelpers.add(helpers);
                disposables.add(new Disposable(() => viewport.additionalHelpers.delete(helpers)));

                let lastMoveEvent: PointerEvent | undefined = undefined;
                let lastSnap: Snap | undefined = undefined;

                const onPointerMove = (e: PointerEvent | undefined) => {
                    if (e === undefined) return;
                    if (isNavigating) return;

                    lastMoveEvent = e;
                    picker.setFromCamera(viewport.getNormalizedMousePosition(e), camera);

                    const { presentation, snappers } = Presentation.make(picker, viewport, model, editor.snaps, editor.snapPresenter);

                    this.model.activateMutualSnaps(snappers);

                    helpers.clear();
                    const { names, helpers: newHelpers, nearby: indicators } = presentation;
                    for (const i of indicators) helpers.add(i);

                    info = presentation.info;
                    if (info === undefined) return;

                    lastSnap = info.snap;
                    const { position } = info;

                    helpers.add(...newHelpers);
                    pointTarget.position.copy(position);
                    if (cb !== undefined) cb({ point: position, info });

                    editor.signals.snapped.dispatch(
                        names.length > 0 ?
                            { position: position.clone().project(camera), names }
                            : undefined);
                    editor.signals.pointPickerChanged.dispatch();
                }

                const onPointerDown = (e: PointerEvent) => {
                    if (e.button != 0) return;
                    if (isNavigating) return;

                    dispose();
                    finish();
                    info = undefined;
                }

                const onKeyDown = (e: KeyboardEvent) => {
                    if (isNavigating) return;

                    if (e.key == "Control") {
                        editor.snaps.enabled = false;
                        onPointerMove(lastMoveEvent);
                    } else if (e.key == "Shift") {
                        this.model.choose(lastSnap);
                    }
                }

                const onKeyUp = (e: KeyboardEvent) => {
                    if (isNavigating) return;

                    if (e.key == "Control") {
                        editor.snaps.enabled = true;
                        onPointerMove(lastMoveEvent);
                    } else if (e.key == "Shift") {
                        const oldChoice = this.model.choice;
                        this.model.choice = undefined;
                        if (lastSnap !== undefined) model.activateSnapped([lastSnap]);
                        if (oldChoice !== undefined) onPointerMove(lastMoveEvent);
                    }
                }

                const d = model.registerKeyboardCommands(viewport.domElement, () => onPointerMove(lastMoveEvent));
                disposables.add(d);

                domElement.addEventListener('pointermove', onPointerMove);
                domElement.addEventListener('pointerdown', onPointerDown);
                document.addEventListener('keydown', onKeyDown);
                document.addEventListener('keyup', onKeyUp);
                disposables.add(new Disposable(() => domElement.removeEventListener('pointermove', onPointerMove)));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointerdown', onPointerDown)));
                disposables.add(new Disposable(() => document.removeEventListener('keydown', onKeyDown)));
                disposables.add(new Disposable(() => document.removeEventListener('keyup', onKeyUp)));
            }
            const dispose = () => {
                disposables.dispose();
                editor.signals.pointPickerChanged.dispatch();
            }
            const finish = () => {
                const point = pointTarget.position.clone();
                const pointResult = { point, info: info! };
                model.addPickedPoint(pointResult);
                resolve(pointResult);
            }
            return { dispose, finish };
        });
    }

    private disablePickingDuringNavigation(navigationControls: OrbitControls, start: () => void, end: () => void): Disposable {
        const onStart = (e: THREE.Event) => {
            start();
            navigationControls.addEventListener('end', onEnd);
        }
        const onEnd = (e: THREE.Event) => {
            end();
            navigationControls.removeEventListener('end', onEnd);
        }
        navigationControls.addEventListener('start', onStart);
        return new Disposable(() => navigationControls.removeEventListener('start', onStart));
    }

    get straightSnaps() { return this.model.straightSnaps }
    restrictToPlaneThroughPoint(pt: THREE.Vector3) { this.model.restrictToPlaneThroughPoint(pt) }
    restrictToPlane(plane: PlaneSnap) { return this.model.restrictToPlane(plane) }
    restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3) { this.model.restrictToLine(origin, direction) }
    addAxesAt(pt: THREE.Vector3, orientation = new THREE.Quaternion()) { this.model.addAxesAt(pt, orientation) }
    addSnap(...snaps: Snap[]) { this.model.addSnap(...snaps) }
    clearAddedSnaps() { this.model.clearAddedSnaps() }
    undo() { this.model.undo() }
    restrictToEdges(edges: visual.CurveEdge[]) { return this.model.restrictToEdges(edges) }
    restrictToCurves(curves: visual.SpaceInstance<visual.Curve3D>[]) { return this.model.restrictToCurves(curves) }
    set restrictToConstructionPlane(v: boolean) { this.model.restrictToConstructionPlane = v }
}