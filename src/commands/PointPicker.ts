import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { OrbitControls } from '../components/viewport/OrbitControls';
import { Viewport } from '../components/viewport/Viewport';
import { CrossPointDatabase } from '../editor/curves/CrossPointDatabase';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import { VisibleLayers } from '../editor/LayerManager';
import { AxisCrossPointSnap, AxisSnap, CrossPointSnap, CurveEdgeSnap, CurvePointSnap, CurveSnap, FacePointSnap, Layers, LineSnap, OrRestriction, PlaneSnap, PointSnap, Restriction, Snap } from "../editor/snaps/Snap";
import { SnapManager, SnapResult } from '../editor/snaps/SnapManager';
import { SnapPresenter } from '../editor/snaps/SnapPresenter';
import * as visual from "../editor/VisualModel";
import { CancellablePromise } from '../util/Cancellable';
import { point2point } from '../util/Conversion';
import { Helper, Helpers } from '../util/Helpers';

const pointGeometry = new THREE.SphereGeometry(0.03, 8, 6, 0, Math.PI * 2, 0, Math.PI);

export interface EditorLike {
    db: DatabaseLike,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals,
    helpers: Helpers,
    snapPresenter: SnapPresenter,
    crosses: CrossPointDatabase,
}

export type PointInfo = { constructionPlane: PlaneSnap, snap: Snap }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

export class Model {
    private readonly pickedPointSnaps = new Array<PointSnap>(); // Snaps inferred from points the user actually picked
    straightSnaps = new Set([AxisSnap.X, AxisSnap.Y, AxisSnap.Z]); // Snaps going straight off the last picked point
    private readonly otherAddedSnaps = new Array<Snap>();

    private readonly restrictions = new Array<Restriction>();
    private readonly restrictionSnaps = new Array<Snap>(); // Snap targets for the restrictions
    restrictToConstructionPlane = false;
    private restrictionPoint?: THREE.Vector3;
    restrictionPlane?: PlaneSnap;

    constructor(
        private readonly db: DatabaseLike,
        private readonly manager: SnapManager,
        private readonly crosses: CrossPointDatabase,
    ) { }

    snapsFor(constructionPlane: PlaneSnap, isOrtho: boolean): Snap[] {
        const result = [...this.snaps];
        result.push(this.actualConstructionPlaneGiven(constructionPlane, isOrtho));
        return result;
    }

    restrictionSnapsFor(constructionPlane: PlaneSnap, isOrtho: boolean): Snap[] {
        const snaps = [...this.restrictionSnaps];
        if (snaps.length === 0) snaps.push(this.actualConstructionPlaneGiven(constructionPlane, isOrtho))
        return snaps;
    }

    restrictionsFor(constructionPlane: PlaneSnap, isOrtho: boolean): Restriction[] {
        const restrictions = [...this.restrictions];
        this.addConstructionPlaneIfPlanarRestriction(constructionPlane, restrictions, isOrtho);
        return restrictions;
    }

    private addConstructionPlaneIfPlanarRestriction(constructionPlane: PlaneSnap, collection: Snap[] | Restriction[], isOrtho: boolean) {
        if (this.restrictionPlane !== undefined || this.restrictionPoint !== undefined || this.restrictToConstructionPlane) {
            constructionPlane = this.actualConstructionPlaneGiven(constructionPlane, isOrtho);
            collection.push(constructionPlane);
        }
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
            constructionPlane = constructionPlane.move(last.position);
        }
        return constructionPlane;
    }

    private get axesOfLastPickedPoint(): Snap[] {
        const { pickedPointSnaps, straightSnaps } = this;
        let result: Snap[] = [];
        if (pickedPointSnaps.length > 0) {
            const last = pickedPointSnaps[pickedPointSnaps.length - 1];
            result = result.concat(last.axes(straightSnaps));
        }
        return result;
    }

    addSnap(...snap: Snap[]) {
        this.otherAddedSnaps.push(...snap);
    }

    clearAddedSnaps() {
        this.otherAddedSnaps.length = 0;
    }

    private counter = -1; // counter descends from -1 to avoid conflicting with objects in the geometry database
    private readonly cross2axis = new Map<c3d.SimpleName, AxisSnap>();
    addAxesAt(point: THREE.Vector3, orientation = new THREE.Quaternion()) {
        const rotated = [];
        for (const snap of this.straightSnaps) rotated.push(snap.rotate(orientation));
        const axes = new PointSnap(undefined, point).axes(rotated);
        for (const axis of axes) {
            this.otherAddedSnaps.push(axis);
            const counter = this.counter--;
            const crosses = this.crosses.add(counter, new c3d.Line3D(point2point(axis.o), point2point(axis.o.clone().add(axis.n))));
            this.cross2axis.set(counter, axis);
            for (const cross of crosses) {
                if (cross.position.manhattanDistanceTo(point) < 10e-3) continue;
                this.otherAddedSnaps.push(new AxisCrossPointSnap(cross, axis, this.cross2axis.get(cross.on2.id)));
            }
        }
    }

    get snaps() {
        return this.axesOfLastPickedPoint.concat(this.otherAddedSnaps);
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
        this.restrictionSnaps.push(line);
    }

    restrictToEdges(edges: visual.CurveEdge[]): OrRestriction<CurveEdgeSnap> {
        const restrictions = [];
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge);
            const restriction = new CurveEdgeSnap(edge, model);
            this.restrictionSnaps.push(restriction);
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
            this.restrictionSnaps.push(restriction);
            restrictions.push(restriction);
        }
        const restriction = new OrRestriction(restrictions);
        this.restrictions.push(restriction);
        return restriction;
    }

    private lastPickedSnap?: Snap;
    addPickedPoint(pointResult: PointResult) {
        const { point, info: { snap } } = pointResult;
        this.pickedPointSnaps.push(new PointSnap(undefined, point));
        this.pointActivatedSnaps.clear();
        this.lastPickedSnap = snap;
    }

    undo() {
        this.pickedPointSnaps.pop();
        this.pointActivatedSnaps.clear();
    }

    private readonly snapActivatedSnaps = new Set<Snap>();
    activateSnapped(snaps: SnapResult[]) {
        for (const { snap } of snaps) {
            if (this.snapActivatedSnaps.has(snap)) continue;
            this.snapActivatedSnaps.add(snap); // idempotent
            if (snap instanceof CurvePointSnap || snap instanceof FacePointSnap) {
                this.addAxesAt(snap.position);
            }
        }
        this.activatePointActivatedSnaps(snaps);
    }

    // Activate snaps like tan/tan and perp/perp which only make sense when the previously selected point and the
    // current nearby snaps match certain conditions.
    private readonly pointActivatedSnaps = new Set<Snap>();
    private activatePointActivatedSnaps(nearby: SnapResult[]) {
        const { pointActivatedSnaps, pickedPointSnaps, lastPickedSnap } = this;
        if (pickedPointSnaps.length === 0 || lastPickedSnap === undefined) return;

        const last = pickedPointSnaps[pickedPointSnaps.length - 1];
        for (const { snap } of nearby) {
            if (pointActivatedSnaps.has(snap)) continue;
            pointActivatedSnaps.add(snap); // idempotent

            if (snap instanceof CurveSnap) {
                const additional = snap.additionalSnapsForLast(last.position, lastPickedSnap);
                this.addSnap(...additional);
            }
        }
    }
}

interface SnapInfo extends PointInfo {
    position: THREE.Vector3;
}

// This is a presentation or template class that contains all info needed to show "nearby" and "snap" points to the user
// There are icons, indicators, textual names explanations, etc.
export class Presentation {
    static make(raycaster: THREE.Raycaster, viewport: Viewport, model: Model, snaps: SnapManager, presenter: SnapPresenter) {
        const { constructionPlane, isOrtho } = viewport;

        if (isOrtho) snaps.layers.disable(Layers.FaceSnap);
        else snaps.layers.enable(Layers.FaceSnap);

        const restrictions = model.restrictionsFor(constructionPlane, isOrtho);
        const nearby = snaps.nearby(raycaster, model.snaps, restrictions);
        const snappers = snaps.snap(raycaster, model.snapsFor(constructionPlane, isOrtho), model.restrictionSnapsFor(constructionPlane, isOrtho), restrictions);
        const actualConstructionPlaneGiven = model.actualConstructionPlaneGiven(constructionPlane, isOrtho);

        const presentation = new Presentation(nearby, snappers, actualConstructionPlaneGiven, isOrtho, presenter);
        return { presentation, snappers, nearby };
    }

    readonly helpers: THREE.Object3D[];
    readonly info?: SnapInfo;
    readonly names: string[];
    readonly nearby: Helper[];

    constructor(nearby: SnapResult[], snaps: SnapResult[], constructionPlane: PlaneSnap, isOrtho: boolean, presenter: SnapPresenter) {
        this.nearby = nearby.map(n => presenter.hoverIndicatorFor(n));

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
    private readonly model = new Model(this.editor.db, this.editor.snaps, new CrossPointDatabase(this.editor.crosses));
    private readonly helper = new PointTarget();

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

            document.body.setAttribute("gizmo", "point-picker");
            disposables.add(new Disposable(() => document.body.removeAttribute('gizmo')));

            const raycaster = new THREE.Raycaster();
            raycaster.params = this.raycasterParams;
            raycaster.layers = VisibleLayers;

            editor.helpers.add(pointTarget);
            disposables.add(new Disposable(() => editor.helpers.remove(pointTarget)));
            disposables.add(new Disposable(() => editor.signals.snapped.dispatch(undefined)));

            const helpers = new THREE.Scene();
            this.editor.helpers.add(helpers);
            disposables.add(new Disposable(() => this.editor.helpers.remove(helpers)));

            let info: SnapInfo | undefined = undefined;
            for (const viewport of this.editor.viewports) {
                viewport.selector.enabled = false;
                disposables.add(new Disposable(() => viewport.enableControls()))

                let isNavigating = false;
                disposables.add(this.disablePickingDuringNavigation(viewport.navigationControls,
                    () => isNavigating = true,
                    () => isNavigating = false));

                const { camera, renderer: { domElement } } = viewport;

                let lastMoveEvent: PointerEvent | undefined = undefined
                const onPointerMove = (e: PointerEvent) => {
                    if (isNavigating) return;

                    lastMoveEvent = e;
                    const pointer = getPointer(e);
                    raycaster.setFromCamera(pointer, camera);

                    const { presentation, snappers } = Presentation.make(raycaster, viewport, model, editor.snaps, editor.snapPresenter);

                    this.model.activateSnapped(snappers);

                    helpers.clear();
                    const { names, helpers: newHelpers, nearby: indicators } = presentation;
                    for (const i of indicators) helpers.add(i);

                    info = presentation.info;
                    if (info === undefined) return;

                    const { position } = info;

                    helpers.add(...newHelpers);
                    pointTarget.position.copy(position);
                    if (cb !== undefined) cb({ point: position, info });

                    editor.signals.snapped.dispatch(
                        names.length > 0 ?
                            { position: position.clone().project(camera), names: names }
                            : undefined);

                    editor.signals.pointPickerChanged.dispatch();
                }

                const getPointer = (e: PointerEvent) => {
                    const rect = domElement.getBoundingClientRect();
                    const pointer = e;

                    return {
                        x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
                        y: - (pointer.clientY - rect.top) / rect.height * 2 + 1,
                        button: e.button
                    };
                }

                const onPointerDown = (e: PointerEvent) => {
                    if (e.button != 0) return;
                    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
                    dispose();
                    finish();
                    info = undefined;
                }

                let ctrlKey = false;
                const onKeyDown = (e: KeyboardEvent) => {
                    if (!e.ctrlKey) return;
                    ctrlKey = true;
                    editor.snaps.toggle();
                    if (lastMoveEvent !== undefined) onPointerMove(lastMoveEvent);
                }
                const onKeyUp = (e: KeyboardEvent) => {
                    if (!ctrlKey) return;
                    editor.snaps.toggle();
                    if (lastMoveEvent !== undefined) onPointerMove(lastMoveEvent);
                }

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