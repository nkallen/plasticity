import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Editor } from '../../Editor';
import * as visual from "../../VisualModel";

interface GizmoView {
    picker: THREE.Object3D;
    delta: THREE.Object3D;
    helper: THREE.Object3D;
    handle: THREE.Object3D;
}

export abstract class AbstractGizmo<CB> extends THREE.Object3D {
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

        this.add(this.handle, this.picker, this.delta, this.helper);
    }

    abstract onPointerMove(cb: CB, pointStart: THREE.Vector2, pointEnd: THREE.Vector2, offset: THREE.Vector2, angle: number): void;

    async execute(cb: CB) {
        const raycaster = new THREE.Raycaster();

        const disposables = new CompositeDisposable();

        this.editor.db.scene.add(this);
        disposables.add(new Disposable(() => this.editor.db.scene.remove(this)));

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
                const center3 = this.position.clone().project(camera);
                const center = new THREE.Vector2(center3.x, center3.y);
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
                    dragging = true;
                }

                const onPointerMove = (event: PointerEvent) => {
                    const pointer = AbstractGizmo.getPointer(domElement, event);
                    if (this.object == null || !dragging || pointer.button !== -1) return;

                    pointEnd.set(pointer.x, pointer.y);
                    offset.copy(pointEnd).sub(pointStart);
                    end.copy(pointEnd).sub(center).normalize();
                    angle = Math.atan2(end.y, end.x) - Math.atan2(start.y, start.x);

                    this.onPointerMove(cb, pointStart, pointEnd, offset, angle);

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

    protected static intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean) {
        const allIntersections = raycaster.intersectObject(object, true);
        for (var i = 0; i < allIntersections.length; i++) {
            if (allIntersections[i].object.visible || includeInvisible) {
                return allIntersections[i];
            }
        }
        return null;
    }
}
