import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { AbstractGizmo, MovementInfo, EditorLike, Intersector, Mode } from "../../command/AbstractGizmo";
import { AdvancedGizmoTriggerStrategy } from "../../command/AdvancedGizmoTriggerStrategy";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { GizmoMaterial } from "../../command/GizmoMaterials";
import { AngleGizmo, AxisHelper, CompositeHelper, DashedLineMagnitudeHelper, NumberHelper, QuaternionStateMachine } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { X, Y, Z } from "../../util/Constants";
import { rad2deg } from "../../util/Conversion";
import { RotateParams } from "./TranslateItemFactory";

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);

export class RotateGizmo extends CompositeGizmo<RotateParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = this.materials.red;
    private readonly green = this.materials.green;
    private readonly blue = this.materials.blue;
    private readonly white = this.materials.white;
    private readonly x = new AxisAngleGizmo("rotate:x", this.editor, this.red);
    private readonly y = new AxisAngleGizmo("rotate:y", this.editor, this.green);
    private readonly z = new AxisAngleGizmo("rotate:z", this.editor, this.blue);
    private readonly screen = new AngleGizmo("rotate:screen", this.editor, this.white);
    private readonly occluder = new OccluderGizmo("rotate:occluder", this.editor, this.materials.occlude);

    private readonly trigger = new AdvancedGizmoTriggerStrategy<any, void>(this.editor);

    get pivot() { return this.position }

    constructor(params: RotateParams, editor: EditorLike) {
        super(params, editor);

        const { x, y, z, screen, occluder } = this;
        for (const g of [x, y, z, screen, occluder]) g.trigger = this.trigger;
    }

    prepare() {
        const { x, y, z, screen } = this;
        for (const o of [x, y, z]) o.relativeScale.setScalar(0.7);
        screen.relativeScale.setScalar(0.8);

        x.quaternion.setFromUnitVectors(Z, X);
        y.quaternion.setFromUnitVectors(Z, Y);
        z.quaternion.setFromUnitVectors(Z, Z);
        this.add(x, y, z, screen, this.occluder);
    }

    private readonly cameraZ = new THREE.Vector3();

    execute(cb: (params: RotateParams) => void, finishFast: Mode = Mode.Persistent | Mode.DisableSelection): CancellablePromise<void> {
        const { x, y, z, screen, params, cameraZ, trigger, occluder } = this;

        const disposable = new CompositeDisposable();
        disposable.add(trigger.execute());

        const state = new QuaternionStateMachine(new THREE.Quaternion());
        state.start();

        for (const i of [x, y, z, screen]) {
            i.addEventListener('end', () => state.push());
            i.addEventListener('interrupt', () => state.interrupt());
        }
        const temp = new THREE.Quaternion();
        const rotate = (axis: THREE.Vector3) => {
            return (angle: number) => {
                const quat = original.copy(state.original);
                quat.multiply(temp.setFromAxisAngle(axis, angle));
                state.current = quat;
                params.axis = axis.clone().applyQuaternion(this.quaternion);
                params.angle = angle;
            }
        }

        const original = new THREE.Quaternion();
        this.addGizmo(x, rotate(X));
        this.addGizmo(y, rotate(Y));
        this.addGizmo(z, rotate(Z));

        this.addGizmo(screen, angle => {
            let axis = cameraZ.copy(Z).applyQuaternion(screen.camera.quaternion);
            AvoidFloatingPointPrecisionIssues: {
                if (Math.abs(Math.abs(axis.dot(X)) - 1) < 10e-5) axis = X.clone().multiplyScalar(Math.sign(axis.dot(X)));
                if (Math.abs(Math.abs(axis.dot(Y)) - 1) < 10e-5) axis = Y.clone().multiplyScalar(Math.sign(axis.dot(Y)));
                if (Math.abs(Math.abs(axis.dot(Z)) - 1) < 10e-5) axis = Z.clone().multiplyScalar(Math.sign(axis.dot(Z)));
            }
            rotate(axis)(angle);
        });

        this.addGizmo(occluder, () => { });

        return super.execute(cb, finishFast, disposable);
    }

    render(params: RotateParams) {
        this.position.copy(params.pivot);
        this.z.value = params.angle;
    }
}

const localZ = new THREE.Vector3();

export class AxisAngleGizmo extends AngleGizmo {
    private sign: number;
    private readonly lineHelper = new AxisHelper(this.material.line);
    private readonly numberHelper = new NumberHelper(rad2deg);
    readonly helper = new CompositeHelper<number>([new DashedLineMagnitudeHelper(), this.lineHelper, this.numberHelper]);

    constructor(name: string, editor: EditorLike, material: GizmoMaterial) {
        super(name, editor, material);
        this.sign = 1;
        this.add(this.helper);
        this.lineHelper.quaternion.setFromUnitVectors(Y, Z);
    }

    onPointerDown(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) {
        this.sign = Math.sign(this.eye.dot(localZ.set(0, 0, 1).applyQuaternion(this.worldQuaternion)));
    }

    override onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) {
        if (this.mode !== 'pointer') return this.state.current;

        const angle = this.sign * info.angle + this.state.original;
        this.state.current = this.truncate(angle, info.event);
        cb(this.state.current);
        return info.angle;
    }

    get shouldLookAtCamera() { return false }
}

export class OccluderGizmo extends AbstractGizmo<void> {
    private readonly occludeBackHalf = new THREE.Mesh(planeGeometry, this.material);
    private readonly occludeBackHalfPicker = new THREE.Mesh(planeGeometry, this.material);

    constructor(private readonly longName: string, editor: EditorLike, private readonly material: THREE.MeshBasicMaterial) {
        super(longName.split(':')[0], editor);
        this.occludeBackHalf.renderOrder = -1;
        this.add(this.occludeBackHalf);
        this.picker.add(this.occludeBackHalfPicker);
    }

    onPointerMove(cb: () => void, intersector: Intersector, info: MovementInfo) {
        return undefined;
    }
    onPointerDown(cb: () => void, intersect: Intersector, info: MovementInfo): void { }
    onPointerUp(cb: () => void, intersect: Intersector, info: MovementInfo): void { }
    onInterrupt(cb: () => void): void { }

    update(camera: THREE.Camera): void {
        this.quaternion.identity();
        super.update(camera);
        this.quaternion.multiplyQuaternions(this.worldQuaternionInv, camera.quaternion);
        this.updateMatrixWorld();
    }

    onDeactivate() { this.visible = false }

    onActivate() { this.visible = true }
}
