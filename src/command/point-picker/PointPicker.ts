import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import CommandRegistry from '../../components/atom/CommandRegistry';
import { OrbitControls } from '../../components/viewport/OrbitControls';
import { Viewport } from '../../components/viewport/Viewport';
import { CrossPointDatabase } from '../../editor/curves/CrossPointDatabase';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from '../../editor/EditorSignals';
import LayerManager from '../../editor/LayerManager';
import { PlaneDatabase } from '../../editor/PlaneDatabase';
import { ConstructionPlane } from "../../editor/snaps/ConstructionPlaneSnap";
import { PointPickerSnapPicker } from "../../editor/snaps/PointPickerSnapPicker";
import { PlaneSnap, PointAxisSnap, PointSnap, Snap } from "../../editor/snaps/Snap";
import { SnapManager } from '../../editor/snaps/SnapManager';
import { PointSnapCache } from "../../editor/snaps/SnapManagerGeometryCache";
import { RaycasterParams } from '../../editor/snaps/SnapPicker';
import { Finish } from '../../util/Cancellable';
import { CancellablePromise } from "../../util/CancellablePromise";
import { Helpers } from '../../util/Helpers';
import * as visual from "../../visual_model/VisualModel";
import { GizmoMaterialDatabase } from '../GizmoMaterials';
import { Executable } from '../Quasimode';
import { SnapInfo, SnapPresentation, SnapPresenter } from '../SnapPresenter';
import { Choices, PointPickerModel, PreferenceMode } from './PointPickerModel';

export const pointGeometry = new THREE.SphereGeometry(0.03, 8, 6, 0, Math.PI * 2, 0, Math.PI);

export interface EditorLike {
    db: DatabaseLike,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals,
    helpers: Helpers,
    crosses: CrossPointDatabase,
    registry: CommandRegistry,
    layers: LayerManager,
    gizmos: GizmoMaterialDatabase;
}

export type PointInfo = { constructionPlane: ConstructionPlane, snap: Snap, orientation: THREE.Quaternion, cameraPosition: THREE.Vector3, cameraOrientation: THREE.Quaternion }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

export class SnapCollection {
    readonly points: Set<PointSnap> = new Set();
    readonly other: Snap[] = [];
    readonly cache = new PointSnapCache();

    push(...snaps: Snap[]) {
        for (const snap of snaps) {
            if (snap instanceof PointSnap) {
                this.points.add(snap)
            } else {
                this.other.push(snap);
            }
        }
    }

    update() {
        this.cache.clear();
        this.cache.add(this.points);
    }

    clear() {
        this.cache.clear();
        this.other.length = 0;
        this.points.clear();
    }
}

class PointPickerKeyboardManager {
    constructor(private readonly pointPicker: PointPickerModel, private readonly registry: CommandRegistry, private readonly signals: EditorSignals) {

    }

    start() {
        const { pointPicker: { snaps: { otherAddedSnaps, snapsForLastPickedPoint } } } = this;

        this.showKeybindingInfo(...otherAddedSnaps.other, ...snapsForLastPickedPoint.other);
        return new Disposable(() => this.hideKeybindingInfo(...otherAddedSnaps.other, ...snapsForLastPickedPoint.other));
    }

    registerKeyboardCommands(domElement: HTMLElement, fn: () => void) {
        const { pointPicker, pointPicker: { snaps: { otherAddedSnaps, snapsForLastPickedPoint } } } = this;

        const choose = (which: Choices) => {
            this.pointPicker.choose(which);
            fn();
        }

        const disposable = new CompositeDisposable();
        for (const snap of [...otherAddedSnaps.other, ...snapsForLastPickedPoint.other]) {
            if (snap instanceof PointAxisSnap) {
                const d = this.registry.addOne(domElement, snap.commandName, _ => choose(snap.name as Choices));
                disposable.add(d);
            }
        }
        return disposable;
    }

    private showKeybindingInfo(...snaps: Snap[]) {
        const { signals, pointPicker } = this;
        for (const snap of snaps) {
            if (snap instanceof PointAxisSnap) {
                signals.keybindingsRegistered.dispatch([snap.commandName]);
            }
        }
        signals.snapsAdded.dispatch({ pointPicker, snaps });
    }

    private hideKeybindingInfo(...snaps: Snap[]) {
        for (const snap of snaps) {
            if (snap instanceof PointAxisSnap) {
                this.signals.keybindingsCleared.dispatch([snap.commandName]);
            }
        }
        this.signals.snapsCleared.dispatch(snaps);
    }
}

export interface PointPickerOptions {
    rejectOnFinish?: boolean;
    result?: PointResult;
}
const defaultOptions: PointPickerOptions = { rejectOnFinish: false }

export class PointPicker implements Executable<PointResult, PointResult> {
    private readonly model = new PointPickerModel(this.editor.db, this.editor.crosses, this.editor.registry, this.editor.signals);
    private readonly keyboard = new PointPickerKeyboardManager(this.model, this.editor.registry, this.editor.signals);

    readonly raycasterParams: RaycasterParams = {
        Line: { threshold: 0.1 },
        Line2: { threshold: 30 },
        Points: { threshold: 25 }
    };

    constructor(private readonly editor: EditorLike) { }

    execute<T>(cb?: ((pt: PointResult) => T) | PointPickerOptions, options?: PointPickerOptions): CancellablePromise<PointResult> {
        const parsed = this.parseOptions(cb, options);
        if (parsed.tag === 'return-early') return parsed.cancellable;
        const { _options, _cb } = parsed;

        return new CancellablePromise<PointResult>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const { editor, editor: { signals, snaps: { cache: snapCache } }, model, keyboard } = this;

            disposables.add(keyboard.start());

            document.body.setAttribute("gizmo", "point-picker");
            disposables.add(new Disposable(() => document.body.removeAttribute('gizmo')));

            const presenter = new SnapPresenter(editor);
            disposables.add(presenter.execute());

            const picker = new PointPickerSnapPicker(this.raycasterParams);
            disposables.add(picker.disposable);

            let lastMoveEvent: (() => void) | undefined = undefined;
            const replayLastMove = () => { if (lastMoveEvent !== undefined) lastMoveEvent() }
            const e = signals.snapsEnabled.add(replayLastMove);
            const d = signals.snapsDisabled.add(replayLastMove);
            disposables.add(new Disposable(() => { e.detach(); d.detach() }))

            let info: SnapInfo | undefined = undefined;
            for (const viewport of editor.viewports) {
                disposables.add(viewport.disableControls(viewport.navigationControls));

                let isNavigating = false;
                disposables.add(this.disablePickingDuringNavigation(viewport.navigationControls,
                    () => isNavigating = true,
                    () => isNavigating = false));

                const { renderer: { domElement } } = viewport;


                const onPointerMove = (e: PointerEvent | undefined) => {
                    if (e === undefined) return;
                    if (isNavigating) return;

                    lastMoveEvent = () => onPointerMove(e);
                    picker.setFromViewport(e, viewport);
                    const { presentation, intersections } = SnapPresentation.makeForPointPicker(picker, viewport, model, editor.db, snapCache, editor.gizmos);
                    presenter.onPointerMove(viewport, presentation);

                    this.model.activateMutualSnaps(intersections.map(s => s.snap));

                    info = presentation.info;
                    if (info === undefined) return;
                    const { position } = info;

                    if (_cb !== undefined) _cb({ point: position, info });
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
                    if (e.repeat) return;
                    if (isNavigating) return;

                    if (e.key == "Shift") {
                        this.model.choose(info?.snap, info, true);
                    }
                }

                const onKeyUp = (e: KeyboardEvent) => {
                    if (isNavigating) return;

                    if (e.key == "Shift") {
                        const oldChoice = this.model.choice;
                        this.model.choose(undefined);
                        // TODO: need to pass all last snap results
                        if (info !== undefined) model.activateSnapped([info.snap], viewport);
                        if (info !== undefined || oldChoice !== undefined) replayLastMove();
                    }
                }

                const d = keyboard.registerKeyboardCommands(viewport.domElement, replayLastMove);
                const f = this.editor.registry.addOne(domElement, "point-picker:finish", _ => {
                    if (_options.rejectOnFinish) {
                        dispose();
                        reject(new Finish());
                        return;
                    }
                    dispose();
                    finish();
                });
                disposables.add(d, f);

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
                if (info === undefined) {
                    reject(new Error("invalid state. If the user did not move their mouse at all, this is ok"));
                    return;
                }
                const point = info.position.clone();
                const pointResult = { point, info };
                model.addPickedPoint(pointResult);
                PlaneDatabase.ScreenSpace.set(pointResult);
                resolve(pointResult);
            }

            return { dispose, finish };
        }).rejectOnInterrupt();
    }

    private parseOptions<T>(cb?: ((pt: PointResult) => T) | PointPickerOptions, options?: PointPickerOptions): ParseResult<T> {
        if (cb !== undefined) {
            if (typeof cb !== 'function') {
                if (options !== undefined) throw new Error("invalid arguments");

                options = cb as PointPickerOptions;
                cb = undefined;
                if (options.result !== undefined) {
                    this.model.addPickedPoint(options.result);
                    return { tag: 'return-early', cancellable: CancellablePromise.resolve(options.result) };
                }
            } else if (options?.result !== undefined) {
                cb(options.result)
            }
        }
        const _options = { ...defaultOptions, ...options };
        const _cb = cb;
        return { tag: 'continue', _options, _cb };
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
    restrictToPlaneThroughPoint(pt: THREE.Vector3, snap?: Snap) { this.model.restrictToPlaneThroughPoint(pt, snap) }
    restrictToPlane(plane: PlaneSnap) { return this.model.restrictToPlane(plane) }
    restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3) { this.model.restrictToLine(origin, direction) }
    addAxesAt(pt: THREE.Vector3, orientation = new THREE.Quaternion()) { this.model.addAxesAt(pt, orientation) }
    addSnap(...snaps: Snap[]) { this.model.addSnap(...snaps) }
    clearAddedSnaps() { this.model.clearAddedSnaps() }
    restrictToEdges(edges: visual.CurveEdge[]) { return this.model.restrictToEdges(edges) }
    set facePreferenceMode(facePreferenceMode: PreferenceMode) { this.model.facePreferenceMode = facePreferenceMode }

    undo() { this.model.undo() }
}

type ParseResult<T> = { tag: 'return-early', cancellable: CancellablePromise<PointResult> } | { tag: 'continue', _options: PointPickerOptions, _cb: ((pt: PointResult) => T) | undefined };
