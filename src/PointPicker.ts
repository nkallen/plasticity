import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from './components/viewport/Viewport';
import { EditorSignals } from './Editor';
import { GeometryDatabase } from './GeometryDatabase';
import { CurveEdgeSnap, PlaneSnap, PointSnap, Restriction, Snap, SnapManager } from './SnapManager';
import { Cancel, CancellablePromise, Finish } from './util/Cancellable';
import * as visual from "./VisualModel";

const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);

interface EditorLike {
    db: GeometryDatabase,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals
}

export type PointInfo = { constructionPlane: PlaneSnap, snap: Snap, restrictions: Restriction[] }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

export class PointPicker {
    private readonly editor: EditorLike;
    private readonly mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    private readonly addedPointSnaps = new Array<PointSnap>();
    private readonly restrictions = new Array<Snap>();

    constructor(editor: EditorLike) {
        this.editor = editor;
        this.mesh.material.depthTest = false;
        this.mesh.renderOrder = 999;
    }

    execute<T>(cb?: (pt: THREE.Vector3) => T): CancellablePromise<PointResult> {
        return new CancellablePromise((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const mesh = this.mesh;
            const editor = this.editor;
            const scene = editor.db.temporaryObjects;
            const raycaster = new THREE.Raycaster();
            raycaster.params.Line = { threshold: 0.1 };
            // @ts-expect-error("Line2 is missing from the typedef")
            raycaster.params.Line2 = { threshold: 100 };

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
                    const sprites = editor.snaps.pick(raycaster, this.snaps, this.restrictions);
                    for (const sprite of sprites) {
                        viewport.overlay.add(sprite);
                    }

                    // if within snap range, change point to snap position
                    const snappers = editor.snaps.snap(raycaster, [constructionPlane, ...this.snaps], this.restrictions);
                    for (const [snap, point] of snappers) {
                        if (cb != null) cb(point);
                        mesh.position.copy(point);
                        mesh.userData.snap = snap;
                        mesh.userData.constructionPlane = constructionPlane;
                        const helper = snap.helper;
                        if (helper !== undefined) viewport.overlay.add(helper);
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
                    const point = mesh.position.clone();
                    const info = mesh.userData as PointInfo;
                    mesh.userData = {};
                    resolve({ point, info });
                    disposables.dispose();
                    this.addedPointSnaps.push(new PointSnap(point.x, point.y, point.z));
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

    private get createdPointSnaps(): Snap[] {
        let result: Snap[] = [...this.addedPointSnaps];
        if (this.addedPointSnaps.length > 0) {
            const last = this.addedPointSnaps[this.addedPointSnaps.length - 1];
            result = result.concat(last.axes);
        }
        return result;
    }

    get snaps() {
        return this.createdPointSnaps.concat(this.restrictions);
    }

    private restrictionPoint?: THREE.Vector3;
    restrictToPlaneThroughPoint(point: THREE.Vector3): void {
        this.restrictionPoint = point;
    }

    restrictToEdges(edges: visual.CurveEdge[]) {
        const edge = edges[0];
        const model = this.editor.db.lookupTopologyItem(edge);
        const restriction = new CurveEdgeSnap(edge, model);
        this.restrictions.push(restriction);
        return restriction;
    }

    undo() {
        this.addedPointSnaps.pop();
    }
}