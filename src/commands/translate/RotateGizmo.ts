import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AngleGizmo, QuaternionStateMachine } from "../MiniGizmos";
import { RotateParams } from "./TranslateFactory";

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export class RotateGizmo extends CompositeGizmo<RotateParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = this.materials.lineRed;
    private readonly green = this.materials.lineGreen;
    private readonly blue = this.materials.lineBlue;
    private readonly white = this.materials.line;
    private readonly x = new AxisAngleGizmo("rotate:x", this.editor, this.red);
    private readonly y = new AxisAngleGizmo("rotate:y", this.editor, this.green);
    private readonly z = new AxisAngleGizmo("rotate:z", this.editor, this.blue);
    private readonly screen = new AngleGizmo("rotate:screen", this.editor, this.white);
    private readonly occludeBackHalf: THREE.Mesh;

    constructor(params: RotateParams, editor: EditorLike) {
        super(params, editor);

        const occludeBackHalf = new THREE.Mesh(planeGeometry, this.materials.occlude);
        occludeBackHalf.renderOrder = -1;
        this.add(occludeBackHalf);
        this.occludeBackHalf = occludeBackHalf;
    }

    prepare() {
        const { x, y, z, screen } = this;
        for (const o of [x, y, z]) o.scale.setScalar(0.7);
        screen.scale.setScalar(0.8);
    }

    execute(cb: (params: RotateParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, screen, params } = this;
        const state = new QuaternionStateMachine(new THREE.Quaternion());
        state.start();

        x.quaternion.setFromUnitVectors(Z, X);
        y.quaternion.setFromUnitVectors(Z, Y);
        z.quaternion.setFromUnitVectors(Z, Z);

        this.add(x, y, z, screen);

        for (const i of [x, y, z, screen]) {
            i.addEventListener('end', () => state.push());
            i.addEventListener('interrupt', () => state.revert());
        }
        const temp = new THREE.Quaternion();
        const rotate = (axis: THREE.Vector3) => {
            return (angle: number) => {
                const quat = original.copy(state.original);
                quat.multiply(temp.setFromAxisAngle(axis, angle));
                state.current = quat;
                params.axis = axis;
                params.angle = angle;
            }
        }

        const original = new THREE.Quaternion();
        this.addGizmo(x, rotate(X));
        this.addGizmo(y, rotate(Y));
        this.addGizmo(z, rotate(Z));

        this.addGizmo(screen, angle => {
            rotate(screen.eye)(angle);
        });

        return super.execute(cb, finishFast);
    }

    update(camera: THREE.Camera): void {
        super.update(camera);

        const eye = new THREE.Vector3();
        eye.copy(camera.position).sub(this.position).normalize();

        this.occludeBackHalf.lookAt(camera.position);
        this.occludeBackHalf.position.copy(this.screen.position);
        this.occludeBackHalf.position.add(eye.clone().multiplyScalar(-0.01))
        this.occludeBackHalf.updateMatrixWorld();
    }
}

export class AxisAngleGizmo extends AngleGizmo {
    update(camera: THREE.Camera) {
        // do not face camera
        this.scaleIndependentOfZoom(camera);
    }
}
