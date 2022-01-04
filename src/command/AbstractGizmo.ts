import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from "../editor/GeometryDatabase";
import LayerManager from "../editor/LayerManager";
import MaterialDatabase from "../editor/MaterialDatabase";
import { SnapManager } from "../editor/snaps/SnapManager";
import { CancellablePromise } from "../util/CancellablePromise";
import { Helper, Helpers } from "../util/Helpers";
import { SnapManagerGeometryCache } from "../visual_model/SnapManagerGeometryCache";
import { GizmoSnapPicker, SnapResult } from "../visual_model/SnapPicker";
import { GizmoMaterialDatabase } from "./GizmoMaterials";
import { Executable } from "./SemiMode";
import { SnapPresentation, SnapPresenter } from "./SnapPresenter";

/**
 * Gizmos are the graphical tools used to run commands, such as move/rotate/fillet, etc.
 * Generally, they have 1) a visible handle and 2) an invisible picker that's larger and easy to click.
 * They also might have a helper and a delta, which are visual feedback for interaction.
 * 
 * AbstractGizmo.execute() handles the basic state machine of hover/mousedown/mousemove/mouseup.
 * It also computes some useful data (e.g., how far the user has dragged) in 2d, 3d cartesian,
 * and polar screen space. By 3d screenspace, I mean mouse positions projected on to a 3d plane
 * facing the camera located at the position of the widget. Subclasses might also compute similar
 * data by implementing onPointerHover/onPointerDown/onPointerMove.
 * 
 * Note that these gizmos ALSO implement Blender-style modal interaction. For example,
 * when a user types "x" with the move gizmo active, it starts moving along the x axis.
 */

export interface GizmoView {
    handle: THREE.Object3D;
    picker: THREE.Object3D;
    helper?: GizmoHelper;
}

export interface EditorLike {
    db: DatabaseLike;
    helpers: Helpers;
    viewports: Viewport[];
    signals: EditorSignals;
    registry: CommandRegistry;
    gizmos: GizmoMaterialDatabase;
    materials: MaterialDatabase;
    snaps: SnapManager;
    layers: LayerManager;
    activeViewport?: Viewport;
}

export interface GizmoLike<I, O> {
    execute(cb: (i: I) => O, finishFast?: Mode): CancellablePromise<void>;
}

export enum Mode {
    None = 0 << 0,
    Persistent = 1 << 0,
    DisableSelection = 1 << 1,
};

export abstract class AbstractGizmo<I, O> extends Helper {
    stateMachine?: GizmoStateMachine<I, O>;
    trigger: GizmoTriggerStrategy<I, O> = new BasicGizmoTriggerStrategy(this.title, this.editor);

    protected handle = new THREE.Group();
    readonly picker = new THREE.Group();
    readonly helper?: GizmoHelper;

    constructor(readonly title: string, protected readonly editor: EditorLike) {
        super();

        this.picker.visible = false; // The picker is only a mouse target; should never be rendered
        this.add(this.handle, this.picker);
    }

    onPointerEnter(intersector: Intersector) { }
    onPointerLeave(intersector: Intersector) { }
    onKeyPress(cb: (i: I) => O, text: string) { }
    abstract onPointerMove(cb: (i: I) => O, intersector: Intersector, info: MovementInfo): void;
    abstract onPointerDown(cb: (i: I) => O, intersect: Intersector, info: MovementInfo): void;
    abstract onPointerUp(cb: (i: I) => O, intersect: Intersector, info: MovementInfo): void;
    abstract onInterrupt(cb: (i: I) => O): void;
    onDeactivate() { }
    onActivate() { }

    execute(cb: (i: I) => O, mode: Mode = Mode.Persistent): CancellablePromise<void> {
        const disposables = new CompositeDisposable();
        if (this.parent === null) {
            this.editor.helpers.add(this);
            disposables.add(new Disposable(() => this.editor.helpers.remove(this)));
        }

        const stateMachine = new GizmoStateMachine(this, this.editor, cb);
        this.stateMachine = stateMachine;
        disposables.add(new Disposable(() => this.stateMachine = undefined));

        return new CancellablePromise<void>((resolve, reject) => {
            // Aggregate the commands, like 'x' for :move:x
            const commands: [string, () => void][] = [];
            const commandNames: string[] = [];
            for (const picker of this.picker.children) {
                if (picker.userData.command == null) continue;
                const [name, fn] = picker.userData.command as [string, () => void];
                commands.push([name, fn]);
                commandNames.push(name);
            }
            this.editor.signals.keybindingsRegistered.dispatch(commandNames);
            disposables.add(new Disposable(() => this.editor.signals.keybindingsCleared.dispatch(commandNames)));

            for (const viewport of this.editor.viewports) {
                const { renderer: { domElement } } = viewport;

                if ((mode & Mode.DisableSelection) === Mode.DisableSelection) {
                    disposables.add(viewport.selector.enable(false));
                }

                // First, register any keyboard commands for each viewport, like 'x' for :move:x
                for (const [name, fn] of commands) {
                    const disp = this.editor.registry.addOne(domElement, name, () => {
                        // If a keyboard command is invoked immediately after the gizmo appears, we will
                        // not have received any pointer info from pointermove/hover. Since we need a "start"
                        // position for many calculations, use the "lastPointerEvent" which is ALMOST always available.
                        const lastEvent = viewport.lastPointerEvent ?? new PointerEvent("pointermove");
                        stateMachine.update(viewport, lastEvent);
                        stateMachine.command(fn, () => {
                            domElement.ownerDocument.body.setAttribute("gizmo", this.title);
                            return addEventHandlers();
                        });
                    });
                    disposables.add(disp);
                }

                // Add handlers when triggered, for example, on pointerdown
                const addEventHandlers = () => {
                    const reenableControls = viewport.disableControls();
                    domElement.ownerDocument.addEventListener('pointermove', onPointerMove);
                    domElement.ownerDocument.addEventListener('pointerup', onPointerUp);
                    return new Disposable(() => {
                        reenableControls.dispose();
                        domElement.ownerDocument.removeEventListener('pointerup', onPointerUp);
                        domElement.ownerDocument.removeEventListener('pointermove', onPointerMove);
                    });
                }

                const onPointerMove = (event: PointerEvent) => {
                    stateMachine.update(viewport, event);
                    stateMachine.pointerMove();
                }

                const onPointerUp = (event: PointerEvent) => {
                    stateMachine.update(viewport, event);
                    stateMachine.pointerUp(() => {
                        if ((mode & Mode.Persistent) !== Mode.Persistent) {
                            dispose();
                            resolve();
                        }
                        domElement.ownerDocument.body.removeAttribute('gizmo');
                    });
                }

                const trigger = this.trigger.register(this, viewport, addEventHandlers);
                disposables.add(trigger);
                this.editor.signals.gizmoChanged.dispatch();
            }
            const dispose = () => {
                stateMachine.finish();
                disposables.dispose();
                this.editor.signals.gizmoChanged.dispatch();
            }
            return { dispose, finish: resolve };
        });
    }

    start(command: string) {
        const event = new CustomEvent(command, { bubbles: true });
        this.editor.activeViewport?.renderer.domElement.dispatchEvent(event);
    }
}

export interface GizmoTriggerStrategy<I, O> {
    register(gizmo: AbstractGizmo<I, O>, viewport: Viewport, addEventHandlers: () => Disposable): Disposable;
}

export class BasicGizmoTriggerStrategy<I, O> implements GizmoTriggerStrategy<I, O> {
    constructor(private readonly title: string, private readonly editor: EditorLike) { }

    register(gizmo: AbstractGizmo<I, O>, viewport: Viewport, addEventHandlers: () => Disposable): Disposable {
        const stateMachine = gizmo.stateMachine!;
        const { renderer: { domElement } } = viewport;

        const onPointerDown = (event: PointerEvent) => {
            stateMachine.update(viewport, event);
            stateMachine.pointerDown(() => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                domElement.ownerDocument.body.setAttribute("gizmo", this.title);
                return addEventHandlers();
            });
        }

        const onKeyPress = (event: KeyboardEvent) => {
            stateMachine.keyPress(event.key);
        }

        const onPointerHover = (event: PointerEvent) => {
            stateMachine.update(viewport, event);
            stateMachine.pointerHover();
        }

        // NOTE: Gizmos take priority over viewport controls; capture:true it's received first here.
        domElement.addEventListener('pointerdown', onPointerDown, { capture: true });
        domElement.addEventListener('pointermove', onPointerHover);
        domElement.ownerDocument.addEventListener('keypress', onKeyPress);
        return new Disposable(() => {
            domElement.removeEventListener('pointerdown', onPointerDown, { capture: true });
            domElement.removeEventListener('pointermove', onPointerHover);
            domElement.ownerDocument.removeEventListener('keypress', onKeyPress);
            domElement.ownerDocument.body.removeAttribute('gizmo');
        });
    }
}

export interface Intersector {
    raycast(...objects: THREE.Object3D[]): THREE.Intersection | undefined;
    snap(): SnapResult[];
}

export interface MovementInfo {
    // These are the mouse down and mouse move positions in screenspace
    pointStart2d: THREE.Vector2;
    pointEnd2d: THREE.Vector2;

    // These are the mouse positions projected on to a plane facing the camera
    // but located at the gizmos position
    pointStart3d: THREE.Vector3;
    pointEnd3d: THREE.Vector3;

    // This is the angle change (polar coordinates) in screenspace
    angle: number;
    center2d: THREE.Vector2;

    viewport: Viewport;

    event: MouseEvent;
}

// This class handles computing some useful data (like click start and click end) of the
// gizmo user interaction. It deals with the hover->click->drag->unclick case (the traditional
// gizmo interactions) as well as the keyboardCommand->move->click->unclick case (blender modal-style).
type State = { tag: 'none' } | { tag: 'hover' } | { tag: 'dragging', clearEventHandlers: Disposable, clearPresenter: Disposable } | { tag: 'command', clearEventHandlers: Disposable, clearPresenter: Disposable, text: string }

export class GizmoStateMachine<I, O> implements MovementInfo {
    // NOTE: isActive and isEnabled differ only slightly. When !isEnabled, the gizmo is COMPLETELY disabled.
    // However, when !isActive, the gizmo will not respond to mouse input, but will respond to keyboard input; ie, the keyboard will interrupt other active gizmos and activate this one.
    private _isActive = true;
    get isActive() { return this._isActive }
    set isActive(isActive: boolean) {
        this._isActive = isActive;
        if (isActive) this.gizmo.onActivate();
        else this.gizmo.onDeactivate();
    }
    isEnabled = true;

    state: State = { tag: 'none' };
    event!: MouseEvent;

    private readonly cameraPlane = new THREE.Mesh(new THREE.PlaneGeometry(100_000, 100_000, 2, 2), new THREE.MeshBasicMaterial());
    readonly pointStart2d = new THREE.Vector2();
    readonly pointEnd2d = new THREE.Vector2();
    readonly pointStart3d = new THREE.Vector3();
    readonly pointEnd3d = new THREE.Vector3();
    readonly center2d = new THREE.Vector2()
    readonly endRadius = new THREE.Vector2();
    readonly currentMousePosition = new THREE.Vector2();
    angle = 0;

    constructor(
        private readonly gizmo: AbstractGizmo<I, O>,
        private readonly editor: EditorLike,
        private readonly cb: (i: I) => O,
    ) { }

    private _viewport!: Viewport;
    get viewport() { return this._viewport }

    private camera!: THREE.Camera;
    update(viewport: Viewport, event: MouseEvent) {
        viewport.getNormalizedMousePosition(event, this.currentMousePosition);
        const camera = viewport.camera;
        this._viewport = viewport;
        this.camera = camera;
        this.gizmo.update(camera);
        this.cameraPlane.position.copy(this.gizmo.position);
        this.cameraPlane.quaternion.copy(camera.quaternion);
        this.cameraPlane.updateMatrixWorld();
        this.raycaster.setFromCamera(this.currentMousePosition, camera);
        this.snapPicker.setFromViewport(event, viewport);
        this.event = event;
    }

    private readonly raycaster = new THREE.Raycaster();
    private readonly snapCache = new SnapManagerGeometryCache(this.editor.snaps);
    private readonly snapPicker = new GizmoSnapPicker(this.editor.layers);
    private readonly presenter = new SnapPresenter(this.editor);
    private readonly raycast = (...obj: THREE.Object3D[]) => GizmoStateMachine.intersectObjectWithRay(obj, this.raycaster);
    private readonly snap = () => {
        const { presentation, intersections } = SnapPresentation.makeForGizmo(this.snapPicker, this.viewport, this.editor.db, this.snapCache, this.editor.gizmos);
        this.presenter.onPointerMove(this.viewport, presentation);
        return intersections;
    }
    private readonly intersector: Intersector = { raycast: this.raycast, snap: this.snap }

    private worldPosition = new THREE.Vector3();
    private begin() {
        const intersection = GizmoStateMachine.intersectObjectWithRay([this.cameraPlane], this.raycaster);
        if (!intersection) throw "corrupt intersection query";

        switch (this.state.tag) {
            case 'none':
            case 'hover':
                const { worldPosition } = this;
                const center3d = this.gizmo.getWorldPosition(worldPosition).project(this.camera);
                this.center2d.set(center3d.x, center3d.y);
                this.pointStart3d.copy(intersection.point);
                this.pointStart2d.copy(this.currentMousePosition);
                this.gizmo.onPointerDown(this.cb, this.intersector, this);
                this.gizmo.helper?.onStart(this.viewport.domElement, this.center2d);
                break;
            case 'command':
                this.pointerMove();
                break;
            default: throw new Error("invalid state");
        }
        this.editor.signals.gizmoChanged.dispatch();
    }

    command(fn: (cb?: (i: I) => O) => void, start: () => Disposable): void {
        if (!this.isEnabled) return;

        switch (this.state.tag) {
            case 'none':
            case 'hover':
                const clearEventHandlers = start();
                if (fn(this.cb) === undefined) {
                    this.gizmo.update(this.camera);
                    this.begin();
                    const clearPresenter = this.presenter.execute();
                    this.state = { tag: 'command', clearEventHandlers, clearPresenter, text: "" };
                    this.gizmo.dispatchEvent({ type: 'start' });
                } else {
                    clearEventHandlers.dispose();
                }
            default: break;
        }
    }

    pointerDown(start: () => Disposable): void {
        if (!this.isActive) return;
        if (!this.isEnabled) return;

        switch (this.state.tag) {
            case 'hover':
                if (this.event.button !== 0) return;

                this.begin();
                const clearEventHandlers = start();
                const clearPresenter = this.presenter.execute();
                this.state = { tag: 'dragging', clearEventHandlers, clearPresenter };
                this.gizmo.dispatchEvent({ type: 'start' });
                break;
            default: break;
        }
    }

    pointerMove(): void {
        if (!this.isActive) return;
        if (!this.isEnabled) return;

        switch (this.state.tag) {
            case 'dragging':
                if (this.event.button !== -1) return;
            case 'command':
                this.pointEnd2d.set(this.currentMousePosition.x, this.currentMousePosition.y);
                const intersection = GizmoStateMachine.intersectObjectWithRay([this.cameraPlane], this.raycaster);
                if (!intersection) throw new Error("corrupt intersection query");
                this.pointEnd3d.copy(intersection.point);
                this.endRadius.copy(this.pointEnd2d).sub(this.center2d).normalize();
                const startRadius = this.pointStart2d.clone().sub(this.center2d);
                this.angle = Math.atan2(this.endRadius.y, this.endRadius.x) - Math.atan2(startRadius.y, startRadius.x);

                this.presenter.clear();
                this.gizmo.helper?.onMove(this.pointEnd2d);
                this.gizmo.onPointerMove(this.cb, this.intersector, this);

                this.editor.signals.gizmoChanged.dispatch();
                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    pointerUp(finish: () => void): void {
        if (!this.isActive) return;
        if (!this.isEnabled) return;

        switch (this.state.tag) {
            case 'dragging':
            case 'command':
                if (this.event.button !== 0) return;

                this.state.clearEventHandlers.dispose();
                this.state.clearPresenter.dispose();
                this.editor.signals.gizmoChanged.dispatch();
                this.state = { tag: 'none' };
                this.gizmo.dispatchEvent({ type: 'end' });
                this.gizmo.onPointerUp(this.cb, this.intersector, this);
                this.gizmo.helper?.onEnd();

                finish();
                break;
            default: break;
        }
    }

    pointerHover(): void {
        if (!this.isActive) return;
        if (!this.isEnabled) return;

        switch (this.state.tag) {
            case 'none': {
                const intersect = GizmoStateMachine.intersectObjectWithRay([this.gizmo.picker], this.raycaster);
                if (intersect !== undefined) {
                    this.gizmo.onPointerEnter(this.intersector);
                    this.state = { tag: 'hover' }
                    // this.viewport.disableControls();
                    this.editor.signals.gizmoChanged.dispatch();
                }
                break;
            }
            case 'hover': {
                const intersect = GizmoStateMachine.intersectObjectWithRay([this.gizmo.picker], this.raycaster);
                if (intersect === undefined) {
                    this.gizmo.onPointerLeave(this.intersector);
                    this.state = { tag: 'none' }
                    // this.viewport.enableControls();
                    this.editor.signals.gizmoChanged.dispatch();
                }
                break;
            }
            default: break;
        }
    }

    keyPress(key: string): void {
        if (!this.isActive) return;
        if (!this.isEnabled) return;

        switch (this.state.tag) {
            case 'command':
                this.state.text += key;
                this.gizmo.onKeyPress(this.cb, this.state.text);
                this.editor.signals.gizmoChanged.dispatch();
                break;
            default: break;
        }
    }

    interrupt() {
        switch (this.state.tag) {
            case 'command':
            case 'dragging':
                this.state.clearEventHandlers.dispose();
                this.state.clearPresenter.dispose();
                this.gizmo.dispatchEvent({ type: 'interrupt' });
                this.gizmo.onInterrupt(this.cb);
                this.gizmo.helper?.onEnd();
            case 'hover':
                this.gizmo.onPointerLeave(this.intersector);
                this.state = { tag: 'none' };
            default: break;
        }
    }

    finish() {
        switch (this.state.tag) {
            case 'command':
            case 'dragging':
                this.state.clearEventHandlers.dispose();
                this.state.clearPresenter.dispose();
                this.gizmo.helper?.onEnd();
            default: break;
        }
    }

    static intersectObjectWithRay(objects: THREE.Object3D[], raycaster: THREE.Raycaster): THREE.Intersection | undefined {
        const allIntersections = raycaster.intersectObjects(objects, true);
        return allIntersections[0];
    }
}

export interface GizmoHelper {
    onStart(parentElement: HTMLElement, position: THREE.Vector2): void;
    onMove(position: THREE.Vector2): void;
    onEnd(): void;
}
