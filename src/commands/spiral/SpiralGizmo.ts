import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { EditorLike, GizmoLike, mode } from "../AbstractGizmo";
import { AngleGizmo, LengthGizmo } from "../MiniGizmos";
import { SpiralParams } from "./SpiralFactory";

export class SpiralGizmo implements GizmoLike<(params: SpiralParams) => void> {
    private readonly angleGizmo: AngleGizmo;
    private readonly lengthGizmo: LengthGizmo;
    private readonly radiusGizmo: LengthGizmo;

    constructor(private readonly params: SpiralParams, editor: EditorLike) {
        this.angleGizmo = new AngleGizmo("spiral:angle", editor);
        this.lengthGizmo = new LengthGizmo("spiral:length", editor);
        this.radiusGizmo = new LengthGizmo("spiral:radius", editor);
    }

    execute(cb: (params: SpiralParams) => void, finishFast: mode = mode.Transitory): CancellablePromise<void> {
        const { angleGizmo, lengthGizmo, radiusGizmo, params } = this;
        const { p2, p1, angle, radius } = params;

        const axis = new THREE.Vector3().copy(p2).sub(p1);
        const length = axis.length();
        axis.normalize();

        lengthGizmo.position.copy(p1);
        lengthGizmo.magnitude = length;
        const quat = new THREE.Quaternion();
        quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
        lengthGizmo.quaternion.copy(quat);

        radiusGizmo.position.copy(p1);
        quat.setFromUnitVectors(new THREE.Vector3(1, 0, 0), axis);
        radiusGizmo.quaternion.copy(quat);
        radiusGizmo.magnitude = params.radius;

        lengthGizmo.tip.add(angleGizmo);
        angleGizmo.scale.setScalar(radius);

        const a = angleGizmo.execute(angle => {
            params.angle = angle;
            cb(params);
        }, finishFast);
        const l = lengthGizmo.execute(length => {
            p2.copy(axis).multiplyScalar(length).add(p1);
            params.p2 = p2;
            cb(params);
        }, finishFast);
        const r = radiusGizmo.execute(radius => {
            params.radius = radius;
            angleGizmo.scale.setScalar(radius);
            cb(params);
        }, finishFast);

        return CancellablePromise.all([a, l, r]);
    }
}