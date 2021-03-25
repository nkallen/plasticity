import { Editor } from './Editor'
import * as THREE from "three";

export class PointPicker {
    editor: Editor;
    mesh: THREE.Object3D;

    constructor(editor: Editor) {
        this.editor = editor;

        const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);
        this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    }

    async execute(cb?: (pt: THREE.Vector3) => void) {
        const viewport = this.editor.viewports[0];
        const renderer = viewport.renderer;
        const camera = viewport.camera;
        const domElement = renderer.domElement;
        const raycaster = new THREE.Raycaster();
        const editor = this.editor;
        const scene = editor.scene;
        const mesh = this.mesh;
        
        scene.add(mesh);

        const planeGeo = new THREE.PlaneGeometry(10000, 10000, 2, 2);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: true, side: THREE.DoubleSide, transparent: true, opacity: 0.1, toneMapped: false });
        const constructionPlane = new THREE.Mesh(planeGeo, planeMat);
        constructionPlane.lookAt(0, 1, 0);
        scene.add(constructionPlane);

        return new Promise<THREE.Vector3>((resolve, reject) => {
            function onPointerMove(e: PointerEvent) {
                const pointer = getPointer(e);
                raycaster.setFromCamera(pointer, camera);
                const planeIntersect = intersectObjectWithRay(constructionPlane, raycaster, true);
                if (planeIntersect != null) {
                    if (cb != null) {
                        cb(planeIntersect.point);
                    }
                    mesh.position.copy(planeIntersect.point);
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
                domElement.removeEventListener('pointermove', onPointerMove);
                domElement.removeEventListener('pointerdown', onPointerDown);
                scene.remove(mesh);
                scene.remove(constructionPlane);
                resolve(mesh.position.clone());
            }

            domElement.addEventListener('pointermove', onPointerMove);
            domElement.addEventListener('pointerdown', onPointerDown);
        });
    }
}