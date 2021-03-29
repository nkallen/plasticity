const { CompositeDisposable } = require('event-kit')
import { Editor } from './Editor'
import * as THREE from "three";
import { Disposable } from 'event-kit';

const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);

export class PointPicker {
    editor: Editor;
    mesh: THREE.Object3D = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());

    constructor(editor: Editor) {
        this.editor = editor;
    }

    async execute(cb?: (pt: THREE.Vector3) => void) {
        return new Promise<THREE.Vector3>((resolve, reject) => {
            const mesh = this.mesh;
            const editor = this.editor;
            const scene = editor.scene;
            scene.add(mesh);
            const raycaster = new THREE.Raycaster();

            const disposables = new CompositeDisposable();

            for (const viewport of this.editor.viewports) {
                const renderer = viewport.renderer;
                const camera = viewport.camera;
                const constructionPlane = viewport.constructionPlane.clone();
                if (this.restrictionPoint != null) {
                    constructionPlane.position.copy(this.restrictionPoint)
                }
                const domElement = renderer.domElement;

                scene.add(constructionPlane);

                domElement.addEventListener('pointermove', onPointerMove);
                domElement.addEventListener('pointerdown', onPointerDown);
                disposables.add(new Disposable(() => domElement.removeEventListener('pointermove', onPointerMove)));
                disposables.add(new Disposable(() => domElement.removeEventListener('pointerdown', onPointerDown)));
                disposables.add(new Disposable(() => scene.remove(constructionPlane)));
                function onPointerMove(e: PointerEvent) {
                    const pointer = getPointer(e);
                    raycaster.setFromCamera(pointer, camera);
                    const planeIntersect = intersectObjectWithRay(constructionPlane, raycaster, true);
                    if (planeIntersect != null) {
                        if (cb != null) {
                            cb(planeIntersect.point);
                        }
                        mesh.position.copy(planeIntersect.point);
                        editor.signals.pointPickerChanged.dispatch();
                    }
                }

                function getPointer(e: PointerEvent) {
                    const rect = domElement.getBoundingClientRect();
                    const pointer = e;

                    return {
                        x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
                        y: - (pointer.clientY - rect.top) / rect.height * 2 + 1,
                        button: e.button
                    };
                }

                function intersectObjectWithRay(object: THREE.Object3D, raycaster: THREE.Raycaster, includeInvisible: boolean) {
                    var allIntersections = raycaster.intersectObject(object, true);
                    for (var i = 0; i < allIntersections.length; i++) {
                        if (allIntersections[i].object.visible || includeInvisible) {
                            return allIntersections[i];
                        }
                    }
                    return null;
                }

                function onPointerDown(e: PointerEvent) {
                    scene.remove(mesh);
                    resolve(mesh.position.clone());
                    disposables.dispose();
                    editor.signals.pointPickerChanged.dispatch();
                }
            }
        });
    }

    restrictionPoint?: THREE.Vector3;

    restrictToPlaneThroughPoint(point: THREE.Vector3) {
        this.restrictionPoint = point;
    }
}