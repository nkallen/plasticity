import { CompositeDisposable, Disposable } from "event-kit";
import { Helper } from "../Helpers";
import * as THREE from "three";
import { Editor } from '../Editor';
import * as visual from "../VisualModel";

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
        private readonly editor: Editor,
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
        const raycaster = new THREE.Raycaster();

        const disposables = new CompositeDisposable();

        this.editor.helpers.add(this);
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        return new Promise<void>((resolve, reject) => {
            let hover = false;
            let dragging = false;

            for (const viewport of this.editor.viewports) {
                const renderer = viewport.renderer;
                const camera = viewport.camera;
                const domElement = renderer.domElement;

                const plane = new THREE.Mesh(new THREE.PlaneGeometry(100_000, 100_000, 2, 2), new THREE.MeshBasicMaterial());
                const pointStart2d = new THREE.Vector2();
                const pointEnd2d = new THREE.Vector2();
                const pointStart3d = new THREE.Vector3();
                const pointEnd3d = new THREE.Vector3();
                const center3d = this.position.clone().project(camera);
                const center2d = new THREE.Vector2(center3d.x, center3d.y);
                const start = new THREE.Vector2(); // FIXME something is wrong here
                const radius = new THREE.Vector2();
                let angle = 0;

                const intersector: Intersector = (obj, hid) => AbstractGizmo.intersectObjectWithRay(obj, raycaster, hid);

                const onPointerDown = (event: PointerEvent) => {
                    const pointer = update(event);
                    if (this.object == null || dragging || pointer.button !== 0) return;
                    if (!hover) return;

                    viewport.disableControls();
                    domElement.ownerDocument.addEventListener('pointermove', onPointerMove);
                    domElement.ownerDocument.addEventListener('pointerup', onPointerUp);

                    const intersection = intersector(plane, true);
                    if (intersection == null) return;
                    pointStart2d.set(pointer.x, pointer.y);
                    pointStart3d.copy(intersection.point);

                    this.onPointerDown(intersector);
                    dragging = true;
                }

                const update = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    this.update(camera);
                    plane.quaternion.copy(camera.quaternion);
                    plane.updateMatrixWorld();
                    raycaster.setFromCamera(pointer, camera);
                    return pointer;
                }

                const onPointerMove = (event: PointerEvent) => {
                    const pointer = update(event);
                    if (this.object == null || !dragging || pointer.button !== -1) return;

                    pointEnd2d.set(pointer.x, pointer.y);
                    const intersection = intersector(plane, true);
                    pointEnd3d.copy(intersection.point);
                    radius.copy(pointEnd2d).sub(center2d).normalize();
                    angle = Math.atan2(radius.y, radius.x) - Math.atan2(start.y, start.x);

                    const info: MovementInfo = { pointStart2d, pointEnd2d, radius, angle, pointStart3d, center2d, pointEnd3d }
                    this.onPointerMove(cb, intersector, info);

                    this.editor.signals.pointPickerChanged.dispatch(); // FIXME rename
                }

                const onPointerUp = (event: PointerEvent) => {
                    const pointer = update(event);
                    if (this.object == null || !dragging || pointer.button !== 0) return;

                    disposables.dispose();

                    this.editor.signals.pointPickerChanged.dispatch();
                    dragging = false;
                    viewport.enableControls();
                    resolve();
                }

                const onPointerHover = (event: PointerEvent) => {
                    update(event);
                    if (this.object == null || dragging) return;

                    this.onPointerHover(intersector);

                    const intersect = intersector(this.picker, true);
                    hover = !!intersect;
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

    protected static getPointer(domElement: HTMLElement, event: PointerEvent) {
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