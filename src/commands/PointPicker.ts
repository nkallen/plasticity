import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import { AxisSnap, CurveEdgeSnap, LineSnap, OrRestriction, PlaneSnap, PointSnap, Restriction, Snap, SnapManager } from '../editor/SnapManager';
import * as visual from "../editor/VisualModel";
import { Cancel, CancellablePromise, Finish } from '../util/Cancellable';
import { Helper, Helpers } from '../util/Helpers';

const geometry = new THREE.SphereGeometry(0.03, 8, 6, 0, Math.PI * 2, 0, Math.PI);

interface EditorLike {
    db: DatabaseLike,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals,
    helpers: Helpers
}

export type PointInfo = { constructionPlane: PlaneSnap, snap: Snap }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

type mode = 'RejectOnFinish' | 'ResolveOnFinish'

export class Model {
    private readonly pickedPointSnaps = new Array<PointSnap>(); // Snaps inferred from points the user actually picked
    private lastPickedPointSnap?: Snap;
    straightSnaps = new Set([AxisSnap.X, AxisSnap.Y, AxisSnap.Z]); // Snaps going straight off the last picked point
    private readonly otherAddedSnaps = new Array<Snap>();

    private readonly restrictions = new Array<Restriction>();
    private readonly restrictionSnaps = new Array<Snap>(); // Snap targets for the restrictions
    restrictToConstructionPlane = false;
    private restrictionPoint?: THREE.Vector3;
    restrictionPlane?: PlaneSnap;

    constructor(
        private readonly db: DatabaseLike,
        private readonly manager: SnapManager
    ) { }

    nearby(raycaster: THREE.Raycaster, constructionPlane: PlaneSnap) {
        return this.manager.nearby(raycaster, this.snaps, this.restrictionsFor(constructionPlane));
    }

    snap(raycaster: THREE.Raycaster, constructionPlane: PlaneSnap) {
        const snappers = this.manager.snap(raycaster, this.snapsFor(constructionPlane), this.restrictionSnapsFor(constructionPlane), this.restrictionsFor(constructionPlane));
        if (snappers.length === 0) return;

        // First match is assumed best
        const first = snappers[0];
        const { snap, position, indicator } = first;

        // Collect indicators, etc. as feedback for the user
        const helpers = [];
        helpers.push(indicator);
        const snapHelper = snap.helper;
        if (snapHelper !== undefined) helpers.push(snapHelper);

        const info = { snap, position, constructionPlane: this.actualConstructionPlaneGiven(constructionPlane), helpers };

        // Collect names of other matches to display to user
        let names = [];
        const pos = first.position;
        for (const { snap, position } of snappers) {
            if (position.manhattanDistanceTo(pos) > 10e-6) continue;
            names.push(snap.name);
        }
        names = names.filter(x => x !== undefined) as string[];

        return { info, names };
    }

    snapsFor(constructionPlane: PlaneSnap): Snap[] {
        const result = [...this.snaps];
        result.push(this.actualConstructionPlaneGiven(constructionPlane));
        return result;
    }

    restrictionSnapsFor(constructionPlane: PlaneSnap): Snap[] {
        const snaps = [...this.restrictionSnaps];
        if (snaps.length === 0) snaps.push(this.actualConstructionPlaneGiven(constructionPlane))
        return snaps;
    }

    restrictionsFor(constructionPlane: PlaneSnap): Restriction[] {
        const restrictions = [...this.restrictions];
        this.addConstructionPlaneIfPlanarRestriction(constructionPlane, restrictions);
        return restrictions;
    }

    private addConstructionPlaneIfPlanarRestriction(constructionPlane: PlaneSnap, collection: Snap[] | Restriction[]) {
        if (this.restrictionPlane !== undefined || this.restrictionPoint !== undefined || this.restrictToConstructionPlane) {
            constructionPlane = this.actualConstructionPlaneGiven(constructionPlane);
            collection.push(constructionPlane);
        }
    }

    actualConstructionPlaneGiven(baseConstructionPlane: PlaneSnap) {
        let constructionPlane = baseConstructionPlane;
        if (this.restrictionPlane !== undefined) {
            constructionPlane = this.restrictionPlane;
        } else if (this.restrictionPoint !== undefined) {
            constructionPlane = constructionPlane.move(this.restrictionPoint);
        }
        return constructionPlane;
    }

    private get axesOfLastPickedPoint(): Snap[] {
        const { pickedPointSnaps, straightSnaps, lastPickedPointSnap } = this;
        let result: Snap[] = [];
        if (pickedPointSnaps.length > 0) {
            const last = pickedPointSnaps[pickedPointSnaps.length - 1];
            result = result.concat(last.axes(straightSnaps));
            result = result.concat(lastPickedPointSnap!.additionalSnapsFor(last.position));
        }
        return result;
    }

    addSnap(...snap: Snap[]) {
        this.otherAddedSnaps.push(...snap);
    }

    addAxesAt(point: THREE.Vector3, orientation = new THREE.Quaternion()) {
        const rotated = [];
        for (const snap of this.straightSnaps) rotated.push(snap.rotate(orientation));
        const axes = new PointSnap(undefined, point).axes(rotated);
        for (const axis of axes) this.otherAddedSnaps.push(axis);
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

    addPickedPoint(snap: Snap, point: THREE.Vector3) {
        this.pickedPointSnaps.push(new PointSnap("point", point));
        this.lastPickedPointSnap = snap;
    }

    undo() {
        this.pickedPointSnaps.pop();
    }

    toggleSnaps() {
        this.manager.toggle();
    }
}

class PointTarget extends Helper {
    private readonly mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());

    constructor() {
        super();
        this.add(this.mesh);
    }
}

export class PointPicker {
    private readonly model = new Model(this.editor.db, this.editor.snaps);
    private readonly helper = new PointTarget();

    constructor(private readonly editor: EditorLike) { }

    execute<T>(cb?: (pt: PointResult) => T, resolveOnFinish: mode = 'ResolveOnFinish'): CancellablePromise<PointResult> {
        return new CancellablePromise((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const { helper: pointTarget, editor, model } = this;

            const raycaster = new THREE.Raycaster();
            raycaster.params.Line = { threshold: 0.1 };
            // @ts-expect-error("Line2 is missing from the typedef")
            raycaster.params.Line2 = { threshold: 20 };
            raycaster.layers = visual.VisibleLayers;

            editor.helpers.add(pointTarget);
            disposables.add(new Disposable(() => editor.helpers.remove(pointTarget)));
            disposables.add(new Disposable(() => editor.signals.snapped.dispatch(undefined)));

            const helpers = new THREE.Scene();
            this.editor.helpers.add(helpers);
            disposables.add(new Disposable(() => this.editor.helpers.remove(helpers)));

            let info: PointInfo | undefined = undefined;
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
                    const constructionPlane = viewport.constructionPlane;

                    helpers.clear();
                    const indicators = model.nearby(raycaster, constructionPlane);
                    for (const i of indicators) helpers.add(i);

                    // if within snap range, change point to snap position
                    const snappers = model.snap(raycaster, viewport.constructionPlane);
                    if (snappers === undefined) return;

                    const { info: { position, helpers: newHelpers }, names } = snappers;

                    helpers.add(...newHelpers);
                    info = snappers.info;
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
                    const point = pointTarget.position.clone();
                    resolve({ point, info: info! });
                    disposables.dispose();
                    this.model.addPickedPoint(info!.snap, point);
                    info = undefined;
                    editor.signals.pointPickerChanged.dispatch();
                }

                let ctrlKey = false;
                const onKeyDown = (e: KeyboardEvent) => {
                    if (!e.ctrlKey) return;
                    ctrlKey = true;
                    this.model.toggleSnaps();
                    if (lastMoveEvent !== undefined) onPointerMove(lastMoveEvent);
                }
                const onKeyUp = (e: KeyboardEvent) => {
                    if (!ctrlKey) return;
                    this.model.toggleSnaps();
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
            const cancel = () => {
                disposables.dispose();
                editor.signals.pointPickerChanged.dispatch();
                reject(Cancel);
            }
            const finish = () => {
                const point = pointTarget.position.clone();
                editor.signals.pointPickerChanged.dispatch();
                disposables.dispose();
                if (resolveOnFinish === 'ResolveOnFinish') resolve({ point, info: info! });
                else reject(Finish);
            }
            return { cancel, finish };
        });
    }

    private disablePickingDuringNavigation(navigationControls: OrbitControls, start: () => void, end: () => void): Disposable {
        const onStart = (e: Event) => {
            start();
            navigationControls.addEventListener('end', onEnd);
        }
        const onEnd = (e: Event) => {
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
    undo() { this.model.undo() }
    restrictToEdges(edges: visual.CurveEdge[]) { return this.model.restrictToEdges(edges) }
    set restrictToConstructionPlane(v: boolean) { this.model.restrictToConstructionPlane = v }
}