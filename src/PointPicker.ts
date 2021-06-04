import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Cancel, CancellablePromise, Finish } from './util/Cancellable';
import { Editor } from './Editor';

const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);

export class PointPicker {
    editor: Editor;
    mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());

    constructor(editor: Editor) {
        this.editor = editor;
        this.mesh.material.depthTest = false;
        this.mesh.renderOrder = 999;
    }

    execute<T>(cb?: (pt: THREE.Vector3) => T): CancellablePromise<[THREE.Vector3, THREE.Vector3]> {
        return new CancellablePromise<[THREE.Vector3, THREE.Vector3]>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const mesh = this.mesh;
            const editor = this.editor;
            const scene = editor.db.scene;
            const raycaster = new THREE.Raycaster();
            // @ts-ignore
            raycaster.params.Line.threshold = 0.1;

            scene.add(mesh);
            disposables.add(new Disposable(() => scene.remove(mesh)));

            for (const viewport of this.editor.viewports) {
                viewport.disableControls();
                disposables.add(new Disposable(() => viewport.enableControls()))

                const renderer = viewport.renderer;
                const camera = viewport.camera;
                let constructionPlane = viewport.constructionPlane;
                if (this.restrictionPoint != null) {
                    constructionPlane = constructionPlane.restrict(this.restrictionPoint);
                }
                const domElement = renderer.domElement;

                const editor = this.editor;
                const onPointerMove = (e: PointerEvent) => {
                    const pointer = getPointer(e);
                    raycaster.setFromCamera(pointer, camera);

                    viewport.overlay.clear();
                    const sprites = editor.snaps.pick(raycaster);
                    for (const sprite of sprites) {
                        viewport.overlay.add(sprite);
                    }

                    const snappers = editor.snaps.snap(raycaster, constructionPlane.snapper);
                    for (const [helper, point] of snappers) {
                        if (cb != null) cb(point);
                        mesh.position.copy(point);
                        if (helper != null) viewport.overlay.add(helper);
                        break;
                    }
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

                const onPointerDown = () => {
                    resolve([mesh.position.clone(), constructionPlane.n]);
                    disposables.dispose();
                    editor.signals.pointPickerChanged.dispatch();
                }

                domElement.addEventListener('pointermove', onPointerMove);
                domElement.addEventListener('pointerdown', onPointerDown);
                disposables.add(new Disposable(() => domElement.removeEventListener('pointermove', onPointerMove)));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointerdown', onPointerDown)));
                disposables.add(new Disposable(() => viewport.overlay.clear()));
            }
            const cancel = () => {
                disposables.dispose();
                editor.signals.pointPickerChanged.dispatch();
                reject(Cancel);
            }
            const finish = () => {
                disposables.dispose();
                editor.signals.pointPickerChanged.dispatch();
                reject(Finish);
            }
            return { cancel, finish };
        });
    }

    restrictionPoint?: THREE.Vector3;

    restrictToPlaneThroughPoint(point: THREE.Vector3): void {
        this.restrictionPoint = point;
    }
}