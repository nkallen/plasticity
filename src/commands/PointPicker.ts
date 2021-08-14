import { CompositeDisposable, Disposable } from 'event-kit';
import { cart2vec, vec2cart, vec2vec } from '../util/Conversion';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import { AxisSnap, ConstructionPlaneSnap, CurveEdgeSnap, LineSnap, OrRestriction, PlaneSnap, PointSnap, Restriction, Snap, SnapManager } from '../editor/SnapManager';
import * as visual from "../editor/VisualModel";
import { Cancel, CancellablePromise, Finish } from '../util/Cancellable';

const geometry = new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI);

interface EditorLike {
    db: GeometryDatabase,
    viewports: Viewport[],
    snaps: SnapManager,
    signals: EditorSignals
}

export type PointInfo = { constructionPlane: PlaneSnap, snap: Snap }
export type PointResult = { point: THREE.Vector3, info: PointInfo };

type mode = 'RejectOnFinish' | 'ResolveOnFinish'

export class Model {
    private readonly pickedPointSnaps = new Array<PointSnap>(); // Snaps inferred from points the user actually picked
    straightSnaps = new Set([AxisSnap.X, AxisSnap.Y, AxisSnap.Z]); // Snaps going straight off the last picked point
    private readonly otherAddedSnaps = new Array<Snap>();
    private readonly restrictions = new Array<Restriction>();
    restrictToConstructionPlane = false;
    private restrictionPoint?: THREE.Vector3;
    restrictionPlane?: PlaneSnap;

    constructor(
        private readonly db: GeometryDatabase,
        private readonly snapMan: SnapManager
    ) { }

    nearby(raycaster: THREE.Raycaster, constructionPlane: PlaneSnap) {
        return this.snapMan.nearby(raycaster, this.snaps, this.restrictionsFor(constructionPlane));
    }

    snap(raycaster: THREE.Raycaster, constructionPlane: PlaneSnap) {
        return this.snapMan.snap(raycaster, this.snapsFor(constructionPlane), this.restrictionsFor(constructionPlane));
    }

    restrictionsFor(constructionPlane: PlaneSnap): Restriction[] {
        const restrictions = this.restrictions.slice();
        constructionPlane = this.actualConstructionPlaneGiven(constructionPlane);
        if (this.restrictionPlane !== undefined || this.restrictionPoint !== undefined || this.restrictToConstructionPlane) {
            restrictions.push(constructionPlane);
        }
        return restrictions;
    }

    snapsFor(constructionPlane: PlaneSnap): Snap[] {
        constructionPlane = this.actualConstructionPlaneGiven(constructionPlane);
        return [constructionPlane, ...this.snaps]
    }

    actualConstructionPlaneGiven(baseConstructionPlane: PlaneSnap) {
        let constructionPlane = baseConstructionPlane;
        if (this.restrictionPlane !== undefined) {
            constructionPlane = this.restrictionPlane;
        } else if (this.restrictionPoint !== undefined) {
            constructionPlane = constructionPlane.move(this.restrictionPoint);
        }
        return constructionPlane;
    }

    private get axesOfLastPickedPoint(): Snap[] {
        const { pickedPointSnaps, straightSnaps } = this;
        let result: Snap[] = [];
        if (pickedPointSnaps.length > 0) {
            const last = pickedPointSnaps[pickedPointSnaps.length - 1];
            result = result.concat(last.axes(straightSnaps));
        }
        return result;
    }

    addPointSnap(point: THREE.Vector3) {
        this.otherAddedSnaps.push(new PointSnap(point));
    }

    addAxesAt(point: THREE.Vector3) {
        const axes = new PointSnap(point).axes(this.straightSnaps);
        for (const axis of axes) this.otherAddedSnaps.push(axis);
    }

    get snaps() {
        return this.axesOfLastPickedPoint.concat(this.otherAddedSnaps);
    }

    restrictToPlaneThroughPoint(point: THREE.Vector3) {
        this.restrictionPoint = point;
    }

    restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3) {
        const line = new LineSnap(direction, origin);
        this.restrictions.push(line);

        const p = new THREE.Vector3(1, 0, 0);
        p.cross(direction);
        if (p.lengthSq() < 10e-5) {
            const p = new THREE.Vector3(0, 1, 0);
            p.cross(direction);
        }

        const plane = new PlaneSnap(p, origin);
        this.otherAddedSnaps.push(plane);
    }

    restrictToFace(face: visual.Face, point: THREE.Vector3): PlaneSnap {
        const model = this.db.lookupTopologyItem(face);
        const { normal } = model.NearPointProjection(vec2cart(point));
        const plane = new PlaneSnap(vec2vec(normal), point);
        this.restrictionPlane = plane;
        return plane;
    }

    restrictToEdges(edges: visual.CurveEdge[]): OrRestriction<CurveEdgeSnap> {
        const restrictions = [];
        for (const edge of edges) {
            const model = this.db.lookupTopologyItem(edge);
            const restriction = new CurveEdgeSnap(edge, model);
            this.otherAddedSnaps.push(restriction);
            restrictions.push(restriction);
        }
        const restriction = new OrRestriction(restrictions);
        this.restrictions.push(restriction);
        return restriction;
    }

    addPickedPoint(point: THREE.Vector3) {
        this.pickedPointSnaps.push(new PointSnap(point))
    }

    undo() {
        this.pickedPointSnaps.pop();
    }
}

export class PointPicker {
    private readonly model = new Model(this.editor.db, this.editor.snaps);
    private readonly mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());

    constructor(private readonly editor: EditorLike) {
        this.mesh.material.depthTest = false;
        this.mesh.renderOrder = 999;
        this.mesh.layers.set(visual.Layers.Overlay);
    }

    execute<T>(cb?: (pt: PointResult) => T, resolveOnFinish: mode = 'ResolveOnFinish'): CancellablePromise<PointResult> {
        return new CancellablePromise((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const { mesh, editor, model } = this;
            const temporaryObjects = editor.db.temporaryObjects;

            const raycaster = new THREE.Raycaster();
            raycaster.params.Line = { threshold: 0.1 };
            // @ts-expect-error("Line2 is missing from the typedef")
            raycaster.params.Line2 = { threshold: 20 };
            raycaster.layers = visual.VisibleLayers;

            temporaryObjects.add(mesh);
            disposables.add(new Disposable(() => temporaryObjects.remove(mesh)));

            for (const viewport of this.editor.viewports) {
                viewport.disableControlsExcept();
                disposables.add(new Disposable(() => viewport.enableControls()))

                const { camera, constructionPlane, renderer: { domElement } } = viewport;

                const onPointerMove = (e: PointerEvent) => {
                    const pointer = getPointer(e);
                    raycaster.setFromCamera(pointer, camera);

                    viewport.overlay.clear();
                    const sprites = model.nearby(raycaster, constructionPlane);
                    for (const sprite of sprites) {
                        viewport.overlay.add(sprite);
                    }

                    // if within snap range, change point to snap position
                    const snappers = model.snap(raycaster, constructionPlane);
                    for (const [snap, point] of snappers) {
                        const info = { snap, constructionPlane: this.model.actualConstructionPlaneGiven(constructionPlane) };
                        if (cb !== undefined) cb({ point, info });
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
                    this.model.addPickedPoint(point);
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
                const point = mesh.position.clone();
                editor.signals.pointPickerChanged.dispatch();
                const info = mesh.userData as PointInfo;
                disposables.dispose();
                if (resolveOnFinish === 'ResolveOnFinish') resolve({ point, info });
                else reject(Finish);
            }
            return { cancel, finish };
        });
    }

    get straightSnaps() { return this.model.straightSnaps }
    restrictToPlaneThroughPoint(pt: THREE.Vector3) { this.model.restrictToPlaneThroughPoint(pt) }
    restrictToLine(origin: THREE.Vector3, direction: THREE.Vector3) { this.model.restrictToLine(origin, direction) }
    addAxesAt(pt: THREE.Vector3) { this.model.addAxesAt(pt) }
    undo() { this.model.undo() }
    addPointSnap(pt: THREE.Vector3) { this.model.addPointSnap(pt) }
    restrictToEdges(edges: visual.CurveEdge[]) { return this.model.restrictToEdges(edges) }
    restrictToFace(face: visual.Face, point: THREE.Vector3) { return this.model.restrictToFace(face, point) }
    set restrictToConstructionPlane(v: boolean) { this.model.restrictToConstructionPlane = v }
}