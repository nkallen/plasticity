import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, Intersector, Mode, MovementInfo } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { GizmoMaterial } from "../GizmoMaterials";
import { AngleGizmo, QuaternionStateMachine } from "../MiniGizmos";
import { RotateParams } from "./TranslateFactory";

const planeGeometry = new THREE.PlaneGeometry(100_000, 100_000, 2, 2);
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

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
    private readonly occludeBackHalf: THREE.Mesh;

    constructor(params: RotateParams, editor: EditorLike) {
        super(params, editor);

        const occludeBackHalf = new THREE.Mesh(planeGeometry, this.materials.occlude);
        occludeBackHalf.renderOrder = -1;
        this.add(occludeBackHalf);
        this.occludeBackHalf = occludeBackHalf;
    }

    prepare() {
        const { x, y, z, screen, editor: { viewports } } = this;
        for (const o of [x, y, z]) o.relativeScale.setScalar(0.7);
        screen.relativeScale.setScalar(0.8);

        x.quaternion.setFromUnitVectors(Z, X);
        y.quaternion.setFromUnitVectors(Z, Y);
        z.quaternion.setFromUnitVectors(Z, Z);
    }

    private readonly cameraZ = new THREE.Vector3();

    execute(cb: (params: RotateParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { x, y, z, screen, params, cameraZ } = this;

        const state = new QuaternionStateMachine(new THREE.Quaternion());
        state.start();

        this.add(x, y, z, screen);

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
                params.axis = axis;
                params.angle = angle;
            }
        }

        const original = new THREE.Quaternion();
        this.addGizmo(x, rotate(X));
        this.addGizmo(y, rotate(Y));
        this.addGizmo(z, rotate(Z));

        this.addGizmo(screen, angle => {
            console.log(cameraZ.copy(Z).applyQuaternion(screen.camera.quaternion));
            rotate(cameraZ.copy(Z).applyQuaternion(screen.camera.quaternion))(angle);
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

const localZ = new THREE.Vector3();

export class AxisAngleGizmo extends AngleGizmo {
    private sign: number;

    constructor(name: string, editor: EditorLike, material: GizmoMaterial) {
        super(name, editor, material);
        this.sign = 1;
    }

    onPointerDown(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) {
        this.sign = Math.sign(this.eye.dot(localZ.set(0, 0, 1).applyQuaternion(this.worldQuaternion)));
    }

    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo): void {
        const angle = this.sign * info.angle + this.state.original;
        this.state.current = angle;
        cb(this.state.current);
    }

    get shouldLookAtCamera() { return false }
}
