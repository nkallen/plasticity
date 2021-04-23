import { CompositeDisposable, Disposable } from "event-kit";
import { Cancel, CancellablePromise, Finish } from "../util/Cancellable";
import * as THREE from "three";
import { Editor, EditorSignals } from '../Editor';
import { Helper } from "../util/Helpers";

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

interface GizmoView {
    handle: THREE.Object3D;
    picker: THREE.Object3D;
    delta?: THREE.Object3D;
    helper?: THREE.Object3D;
}

export abstract class AbstractGizmo<CB> extends THREE.Object3D implements Helper {
    handle: THREE.Object3D;
    picker: THREE.Object3D;
    delta?: THREE.Object3D;
    helper?: THREE.Object3D;

    constructor(protected readonly title: string, protected readonly editor: Editor, view: GizmoView) {
        super();

        this.handle = view.handle;
        this.picker = view.picker;
        this.delta = view.delta;
        this.helper = view.helper;

        const elements = [this.handle, this.picker, this.delta, this.helper];
        this.picker.visible = false;
        const filtered = elements.filter(x => !!x) as THREE.Object3D[];
        this.add(...filtered);
    }

    onPointerHover(_intersector: Intersector) { }
    abstract onPointerMove(cb: CB, intersector: Intersector, info: MovementInfo): void;
    abstract onPointerDown(intersect: Intersector): void;

    execute(cb: CB): CancellablePromise<void> {
        this.editor.helpers.add(this);
        const disposables = new CompositeDisposable();
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        const stateMachine = new GizmoStateMachine(this, this.editor.signals, cb);

        return new CancellablePromise<void>((resolve, reject) => {
            for (const viewport of this.editor.viewports) {
                const renderer = viewport.renderer;
                const camera = viewport.camera;
                const domElement = renderer.domElement;

                viewport.setAttribute("gizmo", this.title); // for gizmo-specific keyboard command selectors
                disposables.add(new Disposable(() => viewport.removeAttribute("gizmo")));

                // First, register any keyboard commands, like 'x' for move-x
                const registry = this.editor.registry;
                const commands = [];
                for (const picker of this.picker.children) {
                    if (picker.userData.command == null) continue;
                    const [name, fn] = picker.userData.command;
                    commands.push(name);

                    const disp = registry.addOne(domElement, name, () => {
                        // If a keyboard command is invoked immediately after the gizmo appears, we will
                        // not have received any pointer info from pointermove/hover. Since we need a "start"
                        // position for many calculations, use the "lastPointerEvent" which is ALMOST always available.
                        const lastEvent = viewport.lastPointerEvent ?? new PointerEvent("pointermove");
                        const pointer = AbstractGizmo.getPointer(domElement, lastEvent);
                        stateMachine.update(camera, pointer);
                        stateMachine.command(fn, () => {
                            viewport.disableControls();
                            domElement.ownerDocument.addEventListener('pointermove', onPointerMove);
                            domElement.ownerDocument.addEventListener('pointerup', onPointerUp);
                        });
                    });
                    disposables.add(disp);
                }
                this.editor.signals.keybindingsRegistered.dispatch(commands);
                disposables.add(new Disposable(() => this.editor.signals.keybindingsRegistered.dispatch([])));

                // Next, the basic workflow for pointer events
                const onPointerDown = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.update(camera, pointer);
                    stateMachine.pointerDown(() => {
                        viewport.disableControls();
                        domElement.ownerDocument.addEventListener('pointermove', onPointerMove);
                        domElement.ownerDocument.addEventListener('pointerup', onPointerUp);
                    });
                }

                const onPointerMove = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.update(camera, pointer);
                    stateMachine.pointerMove();
                }

                const onPointerUp = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.update(camera, pointer);
                    stateMachine.pointerUp(() => {
                        disposables.dispose();
                        resolve();
                    });
                }

                const onPointerHover = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.update(camera, pointer);
                    stateMachine.pointerHover();
                }

                domElement.addEventListener('pointerdown', onPointerDown);
                domElement.addEventListener('pointermove', onPointerHover);
                disposables.add(new Disposable(() => viewport.enableControls()));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointerdown', onPointerDown)));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointermove', onPointerHover)));
                disposables.add(new Disposable(() => domElement.ownerDocument.removeEventListener('pointerup', onPointerUp)));
                disposables.add(new Disposable(() => domElement.ownerDocument.removeEventListener('pointermove', onPointerMove)));
                this.editor.signals.pointPickerChanged.dispatch(); // FIXME wrong signal
            }
            const cancel = () => {
                disposables.dispose();
                this.editor.signals.pointPickerChanged.dispatch(); // FIXME wrong signal
                reject(Cancel);
            }
            const finish = () => {
                disposables.dispose();
                this.editor.signals.pointPickerChanged.dispatch(); // FIXME wrong signal
                reject(Finish);
            }
            return { cancel, finish };
        });
    }

    update(camera: THREE.Camera) {
        let factor;
        if (camera instanceof THREE.OrthographicCamera) {
            factor = (camera.top - camera.bottom) / camera.zoom;
        } else if (camera instanceof THREE.PerspectiveCamera) {
            factor = this.position.distanceTo(camera.position) * Math.min(1.9 * Math.tan(Math.PI * camera.fov / 360) / camera.zoom, 7);
        } else {
            throw new Error("Invalid camera type");
        }

        this.scale.set(1, 1, 1).multiplyScalar(factor * 1 / 7);
        this.updateMatrixWorld();
    }

    protected static getPointer(domElement: HTMLElement, event: PointerEvent): Pointer {
        const rect = domElement.getBoundingClientRect();
        const pointer = event;

        return {
            x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
            y: - (pointer.clientY - rect.top) / rect.height * 2 + 1,
            button: event.button
        };
    }
}

export interface Pointer {
    x: number; y: number, button: number
}

export type Intersector = (objects: THREE.Object3D, includeInvisible: boolean) => THREE.Intersection | undefined

export interface MovementInfo {
    // These are the mouse down and mouse move positions in screenspace
    pointStart2d: THREE.Vector2;
    pointEnd2d: THREE.Vector2;

    // These are the mouse positions projected on to a plane parallel to the camera
    // but located at the gizmos position
    pointStart3d: THREE.Vector3;
    pointEnd3d: THREE.Vector3;

    // This is the angle change (polar coordinates) in screenspace
    endRadius: THREE.Vector2;
    angle: number;
    center2d: THREE.Vector2;

    eye: THREE.Vector3;
}

// This class handles computing some useful data (like click start and click end) of the
// gizmo user interaction. It deals with the hover->click->drag->unclick case (the traditional
// gizmo interactions) as well as the keyboardCommand->move->click->unclick case (blender modal-style).
export class GizmoStateMachine<T> implements MovementInfo {
    state: 'none' | 'hover' | 'dragging' | 'command' = 'none';
    private pointer!: Pointer;

    private readonly plane = new THREE.Mesh(new THREE.PlaneGeometry(100_000, 100_000, 2, 2), new THREE.MeshBasicMaterial());
    eye = new THREE.Vector3();
    pointStart2d = new THREE.Vector2();
    pointEnd2d = new THREE.Vector2();
    pointStart3d = new THREE.Vector3();
    pointEnd3d = new THREE.Vector3();
    center2d = new THREE.Vector2()
    endRadius = new THREE.Vector2();
    angle = 0;

    private raycaster = new THREE.Raycaster();

    constructor(
        private readonly gizmo: AbstractGizmo<T>,
        private readonly signals: EditorSignals,
        private readonly cb: T,
    ) { }

    private camera!: THREE.Camera;
    update(camera: THREE.Camera, pointer: Pointer) {
        this.camera = camera;
        this.eye.copy(camera.position).sub(this.gizmo.position).normalize();
        this.gizmo.update(camera);
        this.plane.quaternion.copy(camera.quaternion);
        this.plane.updateMatrixWorld();
        this.raycaster.setFromCamera(pointer, camera);
        this.pointer = pointer;
    }

    intersector: Intersector = (obj, hid) => GizmoStateMachine.intersectObjectWithRay(obj, this.raycaster, hid);

    begin(): void {
        const intersection = this.intersector(this.plane, true);
        if (!intersection) throw "corrupt intersection query";

        switch (this.state) {
            case 'none':
            case 'hover':
                const center3d = this.gizmo.position.clone().project(this.camera);
                this.center2d.set(center3d.x, center3d.y);
                this.pointStart3d.copy(intersection.point);
                this.pointStart2d.set(this.pointer.x, this.pointer.y);
                this.gizmo.onPointerDown(this.intersector);
                break;
            case 'command':
                this.pointerMove();
                break;
            default: throw new Error("invalid state");
        }
        this.signals.pointPickerChanged.dispatch(); // FIXME rename
    }

    command(fn: () => void, start: () => void): void {
        switch (this.state) {
            case 'none':
            case 'hover':
                start();
            case 'command':
                fn();
                this.gizmo.update(this.camera); // FIXME: need to update the gizmo after calling fn. figure out a way to test
                this.begin();
                this.state = 'command';
                break;
            default: break;
        }
    }

    pointerDown(start: () => void): void {
        switch (this.state) {
            case 'hover':
                if (this.pointer.button !== 0) return;

                this.begin();
                this.state = 'dragging';
                start();
                break;
            default: break;
        }
    }

    pointerMove(): void {
        switch (this.state) {
            case 'dragging':
                if (this.pointer.button !== -1) return;
            case 'command':
                this.pointEnd2d.set(this.pointer.x, this.pointer.y);
                const intersection = this.intersector(this.plane, true);
                if (!intersection) throw "corrupt intersection query";
                this.pointEnd3d.copy(intersection.point);
                this.endRadius.copy(this.pointEnd2d).sub(this.center2d).normalize();
                const startRadius = this.pointStart2d.clone().sub(this.center2d);
                this.angle = Math.atan2(this.endRadius.y, this.endRadius.x) - Math.atan2(startRadius.y, startRadius.x);

                this.gizmo.onPointerMove(this.cb, this.intersector, this);
                this.signals.pointPickerChanged.dispatch(); // FIXME rename
                break;
            default: throw new Error('invalid state');
        }
    }

    pointerUp(finish: () => void): void {
        switch (this.state) {
            case 'dragging':
            case 'command':
                if (this.pointer.button !== 0) return;

                this.signals.pointPickerChanged.dispatch();
                this.state = 'none';
                finish();
                break;
            default: break;
        }
    }

    pointerHover(): void {
        switch (this.state) {
            case 'none':
            case 'hover':
                this.gizmo.onPointerHover(this.intersector);
                const intersect = this.intersector(this.gizmo.picker, true);
                this.state = !!intersect ? 'hover' : 'none';
                break;
            default: break;
        }
    }

    static intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean): THREE.Intersection | undefined {
        const allIntersections = raycaster.intersectObject(object, true);
        for (var i = 0; i < allIntersections.length; i++) {
            if (allIntersections[i].object.visible || includeInvisible) {
                return allIntersections[i];
            }
        }
    }
}