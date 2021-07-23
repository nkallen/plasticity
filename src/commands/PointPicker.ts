import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import { AxisSnap, CurveEdgeSnap, OrRestriction, PlaneSnap, PointSnap, Restriction, Snap, SnapManager } from '../editor/SnapManager';
import * as visual from "../editor/VisualModel";
import { Cancel, CancellablePromise, Finish } from '../util/Cancellable';

const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);

interface EditorLike {
    db: GeometryDatabase,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals
}

export type PointInfo = { constructionPlane: PlaneSnap, snap: Snap, restrictions: Restriction[] }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

enum mode { RejectOnFinish, ResolveOnFinish };

export class PointPicker {
    private readonly mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
    private readonly addedPointSnaps = new Array<PointSnap>();
    private readonly otherAddedSnaps = new Array<Snap>();
    private readonly restrictions = new Array<Restriction>();

    straightSnaps = new Set([AxisSnap.X, AxisSnap.Y, AxisSnap.Z]);
    private restrictionPoint?: THREE.Vector3;

    constructor(private readonly editor: EditorLike) {
        this.mesh.material.depthTest = false;
        this.mesh.renderOrder = 999;
        this.mesh.layers.set(visual.Layers.Overlay);
    }

    execute<T>(cb?: (pt: PointResult) => T, resolveOnFinish: mode = mode.ResolveOnFinish): CancellablePromise<PointResult> {
        return new CancellablePromise((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const mesh = this.mesh;
            const editor = this.editor;
            const scene = editor.db.temporaryObjects;
            const raycaster = new THREE.Raycaster();
            raycaster.params.Line = { threshold: 0.1 };
            // @ts-expect-error("Line2 is missing from the typedef")
            raycaster.params.Line2 = { threshold: 20 };

            scene.add(mesh);
            disposables.add(new Disposable(() => scene.remove(mesh)));

            for (const viewport of this.editor.viewports) {
                viewport.disableControls();
                disposables.add(new Disposable(() => viewport.enableControls()))

                const renderer = viewport.renderer;
                const camera = viewport.camera;
                let constructionPlane = viewport.constructionPlane;
                const restrictions = this.restrictions.slice();
                if (this.restrictionPoint != null) {
                    constructionPlane = constructionPlane.restrict(this.restrictionPoint);
                    restrictions.push(constructionPlane);
                }
                const domElement = renderer.domElement;

                const onPointerMove = (e: PointerEvent) => {
                    const pointer = getPointer(e);
                    raycaster.setFromCamera(pointer, camera);

                    viewport.overlay.clear();
                    const sprites = editor.snaps.nearby(raycaster, this.snaps, restrictions);
                    for (const sprite of sprites) {
                        viewport.overlay.add(sprite);
                    }

                    // if within snap range, change point to snap position
                    const snappers = editor.snaps.snap(raycaster, [constructionPlane, ...this.snaps], restrictions);
                    for (const [snap, point] of snappers) {
                        const info = { snap, constructionPlane, restrictions };
                        if (cb != null) cb({ point, info });
                        mesh.position.copy(point);
                        mesh.userData = info;
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
                    this.addedPointSnaps.push(new PointSnap(point));
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
        const { addedPointSnaps, straightSnaps } = this;
        let result: Snap[] = [];
        if (addedPointSnaps.length > 0) {
            const last = addedPointSnaps[addedPointSnaps.length - 1];
            result = result.concat(last.axes(straightSnaps));
        }
        return result;
    }

    addPointSnap(point: THREE.Vector3) {
        this.addedPointSnaps.push(new PointSnap(point));
    }

    addPlacement(point: THREE.Vector3) {
        const axes = new PointSnap(point).axes(this.straightSnaps);
        for (const axis of axes) this.otherAddedSnaps.push(axis);
    }

    get snaps() {
        return this.createdPointSnaps.concat(this.otherAddedSnaps);
    }

    restrictToPlaneThroughPoint(point: THREE.Vector3): void {
        this.restrictionPoint = point;
    }

    restrictToEdges(edges: visual.CurveEdge[]) {
        const restrictions = [];
        for (const edge of edges) {
            const model = this.editor.db.lookupTopologyItem(edge);
            const restriction = new CurveEdgeSnap(edge, model);
            this.otherAddedSnaps.push(restriction);
            restrictions.push(restriction);
        }
        const restriction = new OrRestriction(restrictions);
        this.restrictions.push(restriction);
        return restriction;
    }

    undo() {
        this.addedPointSnaps.pop();
    }
}