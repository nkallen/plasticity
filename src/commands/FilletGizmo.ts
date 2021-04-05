import * as THREE from "three";
import { Editor } from '../Editor'
import { Disposable, CompositeDisposable } from 'event-kit';

const gizmoMaterial = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false
});

const gizmoLineMaterial = new THREE.LineBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    linewidth: 1,
    fog: false,
    toneMapped: false
});

const matInvisible = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matInvisible.opacity = 0.15;
const matYellow = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matYellow.color.set(0xffff00);
const matLineYellow = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineYellow.color.set(0xffff00);
var matHelper = gizmoMaterial.clone();
matHelper.opacity = 0.33;

const sphereGeometry = new THREE.SphereGeometry(0.1);
const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));

export class FilletGizmo extends THREE.Object3D {
    // worldPositionStart = new THREE.Vector3();
    // worldPosition = new THREE.Vector3();
    editor: Editor;

    delta: THREE.Line;
    picker: THREE.Mesh;

    object?: THREE.Object3D;

    constructor(editor: Editor) {
        super();

        this.editor = editor;

        const sphere = new THREE.Mesh(sphereGeometry, matYellow);
        sphere.position.set(0, 1, 0);
        const line = new THREE.Line(lineGeometry, matYellow);
        this.picker = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible);
        this.picker.position.set(0, 0.6, 0);
        const deltaGeometry = new THREE.BufferGeometry();
        deltaGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));
        this.delta = new THREE.Line(deltaGeometry, matHelper);

        this.add(sphere);
        this.add(line);
        this.add(this.picker);
        this.add(this.delta);
        this.renderOrder = Infinity;

        // FIXME don't add to this but make group object
    }

    detach() {
        this.object = undefined;
        this.visible = false;
    }

    attach2(object: THREE.Object3D, point: THREE.Vector3, normal: THREE.Vector3) { // FIXME either rename or inline into execute
        this.object = object;
        this.position.copy(point);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
        this.visible = true;
    }

    changeEvent = { type: 'change' };
    pointerDownEvent = { type: 'pointerDown' };
    pointerUpEvent = { type: 'pointerUp' };
    objectChangeEvent = { type: 'objectChange' };

    async execute(cb: (delta: number) => void) {
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

                let pointStart = new THREE.Vector2();
                let pointEnd = new THREE.Vector2();

                const onPointerDown = (event: PointerEvent) => {
                    const pointer = getPointer(event);
                    if (this.object == null || dragging || pointer.button !== 0) return;
                    if (!hover) return;

                    viewport.disableControls();

                    domElement.ownerDocument.addEventListener('pointermove', onPointerMove);

                    pointStart.set(pointer.x, pointer.y);
                    dragging = true;
                    this.dispatchEvent(this.pointerDownEvent);
                }

                const getPointer = (event: PointerEvent) => {
                    const rect = domElement.getBoundingClientRect();
                    const pointer = event;

                    return {
                        x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
                        y: - (pointer.clientY - rect.top) / rect.height * 2 + 1,
                        button: event.button
                    };
                }

                const intersectObjectWithRay = (object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean) => {
                    var allIntersections = raycaster.intersectObject(object, true);
                    for (var i = 0; i < allIntersections.length; i++) {
                        if (allIntersections[i].object.visible || includeInvisible) {
                            return allIntersections[i];
                        }
                    }
                    return null;
                }

                const onPointerMove = (event: PointerEvent) => {
                    const pointer = getPointer(event);
                    if (this.object == null || !dragging || pointer.button !== -1) return;

                    pointEnd.set(pointer.x, pointer.y);
                    cb(pointStart.distanceTo(pointEnd));

                    this.editor.signals.pointPickerChanged.dispatch(); // FIXME rename
                }

                const onPointerUp = (event: PointerEvent) => {
                    const pointer = getPointer(event);
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

                    const pointer = getPointer(e);
                    raycaster.setFromCamera(pointer, camera);
                    const intersect = intersectObjectWithRay(this.picker, raycaster, false);
                    if (intersect) {
                        hover = true
                    } else {
                        hover = false;
                    }
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

    // updateMatrixWorld() {
    // let factor;
    // if (this.camera.isOrthographicCamera) {
    //     factor = (this.camera.top - this.camera.bottom) / this.camera.zoom;
    // } else {
    //     factor = this.worldPosition.distanceTo(this.cameraPosition) * Math.min(1.9 * Math.tan(Math.PI * this.camera.fov / 360) / this.camera.zoom, 7);
    // }

    // handle.scale.set(1, 1, 1).multiplyScalar(factor * this.size / 7);
    //     this.delta.position.copy(this.worldPositionStart);
    //     const tempVector = new THREE.Vector3();
    //     tempVector.set(1e-10, 1e-10, 1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(-1);
    //     this.delta.scale.copy(tempVector);

    //     super.updateMatrixWorld();
    // }
}