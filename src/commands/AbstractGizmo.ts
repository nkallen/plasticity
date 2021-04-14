import { CompositeDisposable, Disposable } from "event-kit";
import { Helper } from "../Helpers";
import * as THREE from "three";
import { Editor, EditorSignals } from '../Editor';
import * as visual from "../VisualModel";
import { Viewport } from "../Viewport";

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
    delta: THREE.Object3D;
    helper: THREE.Object3D;

    constructor(
        protected readonly editor: Editor,
        private readonly object: visual.SpaceItem | visual.TopologyItem,
        view: GizmoView) {
        super();

        this.handle = view.handle;
        this.picker = view.picker;
        this.delta = view.delta;
        this.helper = view.helper;

        let elements = [this.handle, this.picker, this.delta, this.helper];
        this.picker.visible = false;
        elements = elements.filter(x => !!x);
        this.add(...elements);
    }

    onPointerHover(intersector: Intersector) { }
    abstract onPointerMove(cb: CB, intersector: Intersector, info: MovementInfo): void;
    abstract onPointerDown(intersect: Intersector): void;

    async execute(cb: CB) {
        this.editor.helpers.add(this);
        const disposables = new CompositeDisposable();
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        return new Promise<void>((resolve, reject) => {
            for (const viewport of this.editor.viewports) {
                const renderer = viewport.renderer;
                const camera = viewport.camera;
                const domElement = renderer.domElement;
                const stateMachine = new GizmoStateMachine(camera, this, this.editor.signals, cb);

                // First, register any keyboard commands, like 'x' for move-x
                const registry = this.editor.registry;
                for (const picker of this.picker.children) {
                    if (picker.userData.command == null) continue;
                    const [name, fn] = picker.userData.command;

                    const disp = registry.addOne(domElement, name, () => {
                        stateMachine.command(fn, () => {
                            viewport.disableControls();
                            domElement.ownerDocument.addEventListener('pointermove', onPointerMove);
                            domElement.ownerDocument.addEventListener('pointerup', onPointerUp);
                        });
                    });
                    disposables.add(disp);
                }

                // Next, the basic workflow for pointer events
                const onPointerDown = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.pointerDown(pointer, () => {
                        viewport.disableControls();
                        domElement.ownerDocument.addEventListener('pointermove', onPointerMove);
                        domElement.ownerDocument.addEventListener('pointerup', onPointerUp);
                    });
                }

                const onPointerMove = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.pointerMove(pointer);
                }

                const onPointerUp = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.pointerUp(pointer, () => {
                        viewport.enableControls();
                        disposables.dispose();
                        resolve();
                    });
                }

                const onPointerHover = (event: PointerEvent) => {
                    domElement.focus();
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    stateMachine.pointerHover(pointer);
                }

                domElement.addEventListener('pointerdown', onPointerDown);
                domElement.addEventListener('pointermove', onPointerHover);
                disposables.add(new Disposable(() => domElement.removeEventListener('pointerdown', onPointerDown)));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointermove', onPointerHover)));
                disposables.add(new Disposable(() => domElement.ownerDocument.removeEventListener('pointerup', onPointerUp)));
                disposables.add(new Disposable(() => domElement.ownerDocument.removeEventListener('pointermove', onPointerMove)));
                this.editor.signals.pointPickerChanged.dispatch();
            }
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

    protected static intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean): THREE.Intersection {
        const allIntersections = raycaster.intersectObject(object, true);
        for (var i = 0; i < allIntersections.length; i++) {
            if (allIntersections[i].object.visible || includeInvisible) {
                return allIntersections[i];
            }
        }
        return null;
    }
}

export interface Pointer {
    x: number; y: number, button: number
}

export type Intersector = (objects: THREE.Object3D, includeInvisible: boolean) => THREE.Intersection

export interface MovementInfo {
    // These are the mouse down and mouse move positions in screenspace
    pointStart2d: THREE.Vector2;
    pointEnd2d: THREE.Vector2;

    // These are the mouse positions projected on to a plane parallel to the camera
    // but located at the gizmos position
    pointStart3d: THREE.Vector3;
    pointEnd3d: THREE.Vector3;

    // This is the angle change (polar coordinates) in screenspace
    radius: THREE.Vector2;
    angle: number;
    center2d: THREE.Vector2;
}

// This class handles computing some useful data (like click start and click end) of the
// gizmo user interaction. It deals with the hover->click->drag->unclick case (the traditional
// gizmo interactions) as well as the keyboardCommand->move->click->unclick case (blender modal-style).
class GizmoStateMachine<T> implements MovementInfo {
    private state: 'none' | 'hover' | 'dragging' | 'command' = 'none';
    private pointer!: Pointer;

    private readonly plane = new THREE.Mesh(new THREE.PlaneGeometry(100_000, 100_000, 2, 2), new THREE.MeshBasicMaterial());
    pointStart2d = new THREE.Vector2();
    pointEnd2d = new THREE.Vector2();
    pointStart3d = new THREE.Vector3();
    pointEnd3d = new THREE.Vector3();
    center3d = this.gizmo.position.clone().project(this.camera);
    center2d = new THREE.Vector2(this.center3d.x, this.center3d.y);
    radius = new THREE.Vector2();
    angle = 0;
    private start = new THREE.Vector2(); // FIXME something is wrong here

    private raycaster = new THREE.Raycaster();

    constructor(
        private readonly camera: THREE.Camera,
        private readonly gizmo: AbstractGizmo<T>,
        private readonly signals: EditorSignals,
        private readonly cb: T,
    ) { }

    update(pointer: Pointer) {
        this.gizmo.update(this.camera);
        this.plane.quaternion.copy(this.camera.quaternion);
        this.plane.updateMatrixWorld();
        this.raycaster.setFromCamera(pointer, this.camera);
        this.pointer = pointer;
    }

    intersector: Intersector = (obj, hid) => GizmoStateMachine.intersectObjectWithRay(obj, this.raycaster, hid);

    begin() {
        const intersection = this.intersector(this.plane, true);
        console.assert(intersection != null);
        this.gizmo.update(this.camera);

        switch (this.state) {
            case 'none':
            case 'hover':
                this.pointStart3d.copy(intersection.point);
                this.pointStart2d.set(this.pointer.x, this.pointer.y);
                this.gizmo.onPointerDown(this.intersector);
                break;
            case 'command':
                this.pointerMove(this.pointer);
                break;
            default: throw new Error("invalid state");
        }
        this.signals.pointPickerChanged.dispatch(); // FIXME rename
    }

    command(fn: () => void, start: () => void) {
        switch (this.state) {
            case 'none':
            case 'hover':
                start();
            case 'command':
                fn();
                this.begin();
                this.state = 'command';
                break;
            default: break;
        }
    }

    pointerDown(pointer: Pointer, start: () => void) {
        this.update(pointer);
        switch (this.state) {
            case 'hover':
                if (pointer.button !== 0) return;

                this.begin();
                this.gizmo.onPointerDown(this.intersector);
                this.state = 'dragging';
                start();
                break;
            default: break;
        }
    }

    pointerMove(pointer: Pointer) {
        this.update(pointer);
        switch (this.state) {
            case 'dragging':
                if (pointer.button !== -1) return;
            case 'command':
                this.pointEnd2d.set(pointer.x, pointer.y);
                const intersection = this.intersector(this.plane, true);
                this.pointEnd3d.copy(intersection.point);
                this.radius.copy(this.pointEnd2d).sub(this.center2d).normalize();
                this.angle = Math.atan2(this.radius.y, this.radius.x) - Math.atan2(this.start.y, this.start.x);

                this.gizmo.onPointerMove(this.cb, this.intersector, this);
                this.signals.pointPickerChanged.dispatch(); // FIXME rename
                break;
            default: throw new Error('invalid state');
        }
    }

    pointerUp(pointer: Pointer, finish: () => void) {
        this.update(pointer);
        switch (this.state) {
            case 'dragging':
            case 'command':
                if (pointer.button !== 0) return;

                this.signals.pointPickerChanged.dispatch();
                this.state = 'none';
                finish();
                break;
            default: break;
        }
    }

    pointerHover(pointer: Pointer) {
        this.update(pointer);
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

    protected static intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean): THREE.Intersection {
        const allIntersections = raycaster.intersectObject(object, true);
        for (var i = 0; i < allIntersections.length; i++) {
            if (allIntersections[i].object.visible || includeInvisible) {
                return allIntersections[i];
            }
        }
        return null;
    }
}