import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, GizmoLike, mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { AngleGizmo, LengthGizmo } from "../MiniGizmos";
import { SpiralParams } from "./SpiralFactory";

const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

export class SpiralGizmo extends CompositeGizmo<SpiralParams> {
    private readonly angleGizmo = new AngleGizmo("spiral:angle", this.editor);
    private readonly lengthGizmo = new LengthGizmo("spiral:length", this.editor);
    private readonly radiusGizmo = new LengthGizmo("spiral:radius", this.editor);

    execute(cb: (params: SpiralParams) => void, finishFast: mode = mode.Transitory): CancellablePromise<void> {
        const { angleGizmo, lengthGizmo, radiusGizmo, params } = this;
        const { p2, p1, angle, radius } = params;

        const axis = new THREE.Vector3().copy(p2).sub(p1);
        axis.normalize();

        lengthGizmo.position.copy(p1);
        lengthGizmo.magnitude = axis.length();
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(Y, axis);
        lengthGizmo.quaternion.copy(quat);

        radiusGizmo.position.copy(p1);
        quat.setFromUnitVectors(X, axis);
        radiusGizmo.quaternion.copy(quat);
        radiusGizmo.magnitude = params.radius;

        lengthGizmo.tip.add(angleGizmo);
        angleGizmo.scale.setScalar(radius);

        this.add(lengthGizmo, radiusGizmo);

        this.addGizmo(angleGizmo, angle => {
            params.angle = angle;
            cb(params);
        });
        this.addGizmo(lengthGizmo, length => {
            p2.copy(axis).multiplyScalar(length).add(p1);
            params.p2 = p2;
            cb(params);
        });
        this.addGizmo(radiusGizmo, radius => {
            params.radius = radius;
            angleGizmo.scale.setScalar(radius);
            cb(params);
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return false }
}