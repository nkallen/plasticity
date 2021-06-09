import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from './components/viewport/Viewport';
import { EditorSignals } from './Editor';
import { GeometryDatabase } from './GeometryDatabase';
import { PointSnap, Snap, SnapManager } from './SnapManager';
import { Cancel, CancellablePromise, Finish } from './util/Cancellable';

const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);

interface EditorLike {
    db: GeometryDatabase,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals
}

export class PointPicker {
    private readonly editor: EditorLike;
    private readonly mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    private readonly _snaps = new Array<PointSnap>();
    firstPoint?: THREE.Vector3;

    constructor(editor: EditorLike) {
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
            // @ts-expect-error
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
                    // display potential/nearby snapping positions
                    const sprites = editor.snaps.pick(raycaster, this.snaps);
                    for (const sprite of sprites) viewport.overlay.add(sprite);

                    // if within snap range, change point to snap position
                    const snappers = editor.snaps.snap(raycaster, constructionPlane.snapper, this.snaps);
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

                const onPointerDown = (e: PointerEvent) => {
                    if (e.button != 0) return;
                    const pos = mesh.position.clone();
                    if (this.firstPoint === undefined) {
                        this.firstPoint = pos;
                    }
                    resolve([pos, constructionPlane.n]);
                    disposables.dispose();
                    this._snaps.push(new PointSnap(pos.x, pos.y, pos.z));
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

    get snaps(): Snap[] {
        let result: Snap[] = [...this._snaps];
        if (this._snaps.length > 0) {
            const last = this._snaps[this._snaps.length-1];
            result = result.concat(last.axes);
        }
        return result;
    }

    undo() {
        this._snaps.pop();
    }

    restrictionPoint?: THREE.Vector3;

    restrictToPlaneThroughPoint(point: THREE.Vector3): void {
        this.restrictionPoint = point;
    }
}