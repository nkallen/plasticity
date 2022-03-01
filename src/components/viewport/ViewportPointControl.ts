import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import * as gizmo from "../../command/AbstractGizmo";
import { GizmoLike } from "../../command/AbstractGizmo";
import Command, * as cmd from "../../command/Command";
import { DashedLineMagnitudeHelper } from "../../command/MiniGizmos";
import { SnapPresentation, SnapPresenter } from "../../command/SnapPresenter";
import { MoveContourPointFactory } from "../../commands/modify_contour/ModifyContourPointFactory";
import { GizmoSnapPicker } from "../../editor/snaps/GizmoSnapPicker";
import { SelectionKeypressStrategy } from "../../selection/SelectionKeypressStrategy";
import { ClickChangeSelectionCommand } from "../../selection/ViewportSelector";
import { CancellablePromise } from "../../util/CancellablePromise";
import { Intersection } from "../../visual_model/Intersectable";
import * as visual from '../../visual_model/VisualModel';
import { Viewport } from "./Viewport";
import { ViewportControl } from "./ViewportControl";

/**
 * The PointControl allows dragging and dropping any visible points.
 */

export interface EditorLike extends cmd.EditorLike {
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
    keymaps: AtomKeymap.KeymapManager;
}

type Mode = { tag: 'none' } | { tag: 'start', controlPoint: visual.ControlPoint, disposable: CompositeDisposable } | { tag: 'executing', cb: (delta: THREE.Vector3) => void, cancellable: CancellablePromise<void>, disposable: CompositeDisposable }

export class ViewportPointControl extends ViewportControl implements GizmoLike<THREE.Vector3, void> {
    private readonly keypress = new SelectionKeypressStrategy(this.editor.keymaps);

    private readonly helper = new DashedLineMagnitudeHelper();
    private readonly delta = new THREE.Vector3();
    private readonly pointStart3d = new THREE.Vector3();
    private readonly pointEnd3d = new THREE.Vector3();
    private readonly center2d = new THREE.Vector2();
    private readonly center3d = new THREE.Vector3();
    readonly _raycaster = new THREE.Raycaster();

    private readonly snapPicker = new GizmoSnapPicker();
    private readonly presenter = new SnapPresenter(this.editor);
    private readonly cameraPlane = new THREE.Mesh(new THREE.PlaneGeometry(100_000, 100_000, 2, 2), new THREE.MeshBasicMaterial());

    constructor(viewport: Viewport, private readonly editor: EditorLike) {
        super(viewport, editor.layers, editor.db, editor.signals);
        this._raycaster.layers.enableAll();
    }

    startHover(intersections: Intersection[]) { }
    continueHover(intersections: Intersection[]): void { }
    endHover(): void { }

    private mode: Mode = { tag: 'none' };
    startClick(intersections: Intersection[], downEvent: MouseEvent): boolean {
        if (intersections.length === 0) return false;
        const first = intersections[0].object;
        if (!(first instanceof visual.ControlPoint)) return false;
        const { domElement } = this.viewport;
        if (domElement.ownerDocument.body.hasAttribute('gizmo')) return false;

        switch (this.mode.tag) {
            case 'none':
                const controlPoint = first;

                this.pointStart3d.copy(first.position);
                this.cameraPlane.position.copy(this.pointStart3d);
                this.mode = { tag: 'start', controlPoint, disposable: new CompositeDisposable() };

                break;
            default: throw new Error("invalid state");
        }
        return true;
    }

    endClick(intersections: Intersection[], upEvent: MouseEvent): void {
        switch (this.mode.tag) {
            case 'none': break;
            case 'start':
                const command = new ClickChangeSelectionCommand(this.editor, intersections, this.keypress.event2modifier(upEvent), this.keypress.event2option(upEvent));
                this.editor.enqueue(command, true);
                this.mode.disposable.dispose();
                this.mode = { tag: 'none' };
                break;
            default: throw new Error("invalid state: " + this.mode.tag);
        }
    }

    startDrag(downEvent: MouseEvent, normalizedMousePosition: THREE.Vector2): void {
        switch (this.mode.tag) {
            case 'none': break;
            case 'start':
                const { center2d, center3d, pointStart3d, helper, viewport: { camera } } = this;
                center3d.copy(pointStart3d).project(camera);
                center2d.set(center3d.x, center3d.y);

                const command = new MoveControlPointCommand(this.editor);
                command.controlPoint = this.mode.controlPoint;
                command.gizmo = this;
                this.editor.enqueue(command);

                helper.onStart(this.viewport.domElement, center2d);
        }
    }

    private readonly unprojected = new THREE.Vector3();
    continueDrag(moveEvent: MouseEvent, normalizedMousePosition: THREE.Vector2) {
        switch (this.mode.tag) {
            case 'none': break;
            case 'start': break;
            case 'executing':
                const { pointEnd3d, _raycaster: raycaster, delta, helper, viewport: { camera, constructionPlane }, pointStart3d } = this;
                this.presenter.clear();

                if (moveEvent.ctrlKey) {
                    const { unprojected, snapPicker } = this;
                    snapPicker.setFromViewport(moveEvent, this.viewport);
                    const { presentation, intersections } = SnapPresentation.makeForGizmo(this.snapPicker, this.viewport, this.editor.db, this.editor.snaps.cache, this.editor.gizmos);
                    this.presenter.onPointerMove(this.viewport, presentation);
                    const point: THREE.Vector3 | undefined = intersections[0]?.position.clone();
                    if (point === undefined) return;
                    unprojected.copy(point).project(camera);

                    helper.onMove(unprojected as any);

                    delta.copy(point).sub(pointStart3d);
                    this.mode.cb(delta.clone());
                } else {
                    helper.onMove(normalizedMousePosition);

                    raycaster.setFromCamera(normalizedMousePosition, camera);
                    const moved = constructionPlane.move(pointStart3d);
                    const intersection = raycaster.intersectObject(moved.snapper);
                    if (intersection.length === 0) throw new Error("corrupt intersection query");
                    pointEnd3d.copy(intersection[0].point);

                    const { position } = moved.project(pointEnd3d);
                    delta.copy(position).sub(pointStart3d);

                    this.mode.cb(this.delta.clone());
                }
        }
    }

    endDrag(normalizedMousePosition: THREE.Vector2): void {
        switch (this.mode.tag) {
            case 'none': break;
            case 'start': throw new Error("invalid state");
            case 'executing':
                const { helper } = this;

                helper.onEnd();
                this.mode.cancellable.finish();
                this.mode.disposable.dispose();
                this.mode = { tag: 'none' };
        }
    }

    dblClick(intersections: Intersection[], dblClickEvent: MouseEvent) {
    }

    execute(cb: (delta: THREE.Vector3) => void, finishFast?: gizmo.Mode): CancellablePromise<void> {
        switch (this.mode.tag) {
            case 'start':
                const result = new CancellablePromise<void>((resolve, reject) => {
                    const dispose = () => { }
                    return { dispose, finish: resolve };
                });

                const clearPresenter = this.presenter.execute();
                this.mode.disposable.add(clearPresenter);

                this.mode = { tag: 'executing', cancellable: result, cb, disposable: this.mode.disposable };
                return result;
            default: throw new Error('invalid state');
        }
    }
}

export class MoveControlPointCommand extends cmd.CommandLike {
    controlPoint!: visual.ControlPoint;
    gizmo!: GizmoLike<THREE.Vector3, void>;

    constructor(editor: cmd.EditorLike) { super(editor) }

    async execute(): Promise<void> {
        const { controlPoint, gizmo } = this;
        const modify = new MoveContourPointFactory(this.editor.db, this.editor.materials, this.editor.signals);
        modify.controlPoints = [controlPoint];
        const curve = controlPoint.parentItem;
        const contour = await modify.prepare(curve);
        modify.contour = contour;
        modify.originalItem = curve;

        await gizmo.execute(delta => {
            modify.move = delta;
            modify.update();
        }).resource(this);

        const result = await modify.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}