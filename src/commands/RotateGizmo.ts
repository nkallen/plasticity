import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { Editor } from '../Editor';
import * as visual from "../VisualModel";
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { DoubleSide } from "three";

const gizmoMaterial = new LineMaterial({
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

const matInvisible = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false
})
matInvisible.opacity = 0.15;

const matYellow = gizmoMaterial.clone() as THREE.MeshBasicMaterial;
matYellow.color.set(0xffff00);
const matLineYellow = gizmoLineMaterial.clone() as THREE.LineBasicMaterial;
matLineYellow.color.set(0xffff00);
var matHelper = gizmoMaterial.clone();
matHelper.opacity = 0.33;

const lineGeometry = new THREE.BufferGeometry();
lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));

export class RotateGizmo extends THREE.Object3D {
    // delta: THREE.Line;
    picker: THREE.Mesh;

    constructor(
        private readonly editor: Editor,
        private readonly object: visual.SpaceItem,
        private readonly p1: THREE.Vector3,
        private readonly axis: THREE.Vector3) {
        super();

        const segmentCount = 32;
        const vertices = new Float32Array((segmentCount + 1) * 3);

        const radius = 1;

        for (let i = 0; i <= segmentCount; i++) {
            var theta = (i / segmentCount) * Math.PI * 2;
            vertices[i * 3] = Math.cos(theta) * radius;
            vertices[i * 3 + 1] = Math.sin(theta) * radius;
            vertices[i * 3 + 2] = 0;
        }

        const geometry = new LineGeometry();
        geometry.setPositions(vertices);

        const circle = new Line2(geometry, editor.materials.gizmo());
        circle.renderOrder = Infinity;

        this.position.copy(p1);
        this.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis);

        this.picker = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 4, 24), matInvisible);
        this.add(this.picker);
        this.add(circle);
    }

    async execute(cb: (angle: number) => void) {
        const raycaster = new THREE.Raycaster();

        const disposables = new CompositeDisposable();

        this.editor.db.scene.add(this);
        disposables.add(new Disposable(() => this.editor.db.scene.remove(this)));

        return new Promise<void>((resolve, reject) => {
            const position = this.position;

            for (const viewport of this.editor.viewports) {
                const renderer = viewport.renderer;
                const camera = viewport.camera;
                const domElement = renderer.domElement;

                let dragging = false;
                let hover = false;

                let pointStart = new THREE.Vector2();
                let pointEnd = new THREE.Vector2();

                const center = position.clone().project(camera);
                const foo = new THREE.Vector2(center.x, center.y).normalize();

                const onPointerDown = (event: PointerEvent) => {
                    const pointer = getPointer(event);
                    if (this.object == null || dragging || pointer.button !== 0) return;
                    if (!hover) return;

                    viewport.disableControls();

                    domElement.ownerDocument.addEventListener('pointermove', onPointerMove);

                    pointStart.set(pointer.x, pointer.y);
                    foo.sub(pointStart);
                    dragging = true;
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
                    const offset = pointEnd.clone().sub(pointStart);

                    const bar = pointEnd.clone().sub(center).normalize();


                    cb(rotationAngle);

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
}

class Airplane extends THREE.Mesh {
    constructor(private readonly camera: THREE.Camera) {
        super(
            new THREE.PlaneGeometry(100000, 100000, 2, 2),
            new THREE.MeshBasicMaterial({ visible: false, wireframe: true, side: DoubleSide, transparent: true, opacity: 0.1, toneMapped: false })
        );
    }

    updateMatrixWorld() {
        this.quaternion.copy(this.camera.quaternion);
        super.updateMatrixWorld();
    }
}