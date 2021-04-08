import { CompositeDisposable, Disposable } from "event-kit";
import { Helper } from "../Helpers";
import * as THREE from "three";
import { Editor } from '../Editor';
import * as visual from "../VisualModel";

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
        private readonly object: visual.SpaceItem,
        view: GizmoView) {
        super();

        this.handle = view.handle;
        this.picker = view.picker;
        this.delta = view.delta;
        this.helper = view.helper;

        let elements = [this.handle, this.picker, this.delta, this.helper];
        elements = elements.filter(x => !!x);
        this.add(...elements);
    }

    abstract onPointerMove(cb: CB, intersector: Intersector, info: MovementInfo): void;
    abstract onPointerDown(intersect: Intersector): void;
    update(camera: THREE.Camera) {}

    async execute(cb: CB) {
        const raycaster = new THREE.Raycaster();

        const disposables = new CompositeDisposable();

        this.editor.helpers.add(this);
        disposables.add(new Disposable(() => this.editor.helpers.remove(this)));

        return new Promise<void>((resolve, reject) => {
            for (const viewport of this.editor.viewports) {
                const renderer = viewport.renderer;
                const camera = viewport.camera;
                const domElement = renderer.domElement;

                let dragging = false;
                let hover = false;

                const pointStart = new THREE.Vector2();
                const pointEnd = new THREE.Vector2();
                const offset = new THREE.Vector2();
                const center3d = this.position.clone().project(camera);
                const center2d = new THREE.Vector2(center3d.x, center3d.y);
                const start = new THREE.Vector2();
                const end = new THREE.Vector2();
                let angle = 0;

                const onPointerDown = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    if (this.object == null || dragging || pointer.button !== 0) return;
                    if (!hover) return;

                    viewport.disableControls();
                    domElement.ownerDocument.addEventListener('pointermove', onPointerMove);

                    pointStart.set(pointer.x, pointer.y);

                    raycaster.setFromCamera(pointer, camera);
                    const intersector: Intersector = (obj, hid) => AbstractGizmo.intersectObjectWithRay(obj, raycaster, hid)
                    this.onPointerDown(intersector);

                    dragging = true;
                }

                const onPointerMove = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    if (this.object == null || !dragging || pointer.button !== -1) return;

                    pointEnd.set(pointer.x, pointer.y);
                    offset.copy(pointEnd).sub(pointStart);
                    end.copy(pointEnd).sub(center2d).normalize();
                    angle = Math.atan2(end.y, end.x) - Math.atan2(start.y, start.x);

                    raycaster.setFromCamera(pointer, camera);
                    const intersector: Intersector = (obj, hid) => AbstractGizmo.intersectObjectWithRay(obj, raycaster, hid)
                    const info: MovementInfo = { pointStart, pointEnd, angle }
                    this.onPointerMove(cb, intersector, info);

                    this.editor.signals.pointPickerChanged.dispatch(); // FIXME rename
                }

                const onPointerUp = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    if (this.object == null || !dragging || pointer.button !== 0) return;

                    domElement.ownerDocument.removeEventListener('pointermove', onPointerMove);
                    disposables.dispose();

                    this.editor.signals.pointPickerChanged.dispatch();
                    dragging = false;
                    viewport.enableControls();
                    resolve();
                }

                const onPointerHover = (e: PointerEvent) => {
                    if (this.object == null || dragging) return;

                    const pointer = AbstractGizmo.getPointer(domElement, e);
                    raycaster.setFromCamera(pointer, camera);
                    const intersect = AbstractGizmo.intersectObjectWithRay(this.picker, raycaster, false);
                    hover = !!intersect;
                }

                domElement.addEventListener('pointerdown', onPointerDown);
                domElement.addEventListener('pointermove', onPointerHover);
                domElement.ownerDocument.addEventListener('pointerup', onPointerUp);
                disposables.add(new Disposable(() => domElement.removeEventListener('pointerdown', onPointerDown)));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointermove', onPointerHover)));
                disposables.add(new Disposable(() => domElement.ownerDocument.removeEventListener('pointerup', onPointerUp)));
                this.editor.signals.pointPickerChanged.dispatch();
            }
        });
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
    pointStart: THREE.Vector2,
    pointEnd: THREE.Vector2,
    angle: number
}