import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { Mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { FilletMagnitudeGizmo } from "../fillet/FilletGizmo";
import { AngleGizmo } from "../MiniGizmos";
import { SpiralParams } from "./SpiralFactory";

const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

export class SpiralGizmo extends CompositeGizmo<SpiralParams> {
    private readonly angleGizmo = new SpiralAngleGizmo("spiral:angle", this.editor);
    private readonly lengthGizmo = new FilletMagnitudeGizmo("spiral:length", this.editor);
    private readonly radiusGizmo = new FilletMagnitudeGizmo("spiral:radius", this.editor);

    protected prepare(mode: Mode) {
        const { angleGizmo, lengthGizmo, radiusGizmo, params } = this;
        const { p2, p1, angle, radius } = params;

        const axis = new THREE.Vector3().copy(p2).sub(p1);

        lengthGizmo.position.copy(p1);
        const quat = new THREE.Quaternion();
        lengthGizmo.value = 1;
        axis.normalize();
        quat.setFromUnitVectors(Y, axis);
        lengthGizmo.quaternion.copy(quat);
        lengthGizmo.relativeScale.setScalar(0.8);

        radiusGizmo.position.copy(p1);
        quat.setFromUnitVectors(X, axis);
        radiusGizmo.quaternion.copy(quat);
        radiusGizmo.relativeScale.setScalar(0.8);
        radiusGizmo.value = radius;

        lengthGizmo.tip.add(angleGizmo);
        angleGizmo.relativeScale.setScalar(0.3);

        this.add(lengthGizmo, radiusGizmo);
    }

    execute(cb: (params: SpiralParams) => void): CancellablePromise<void> {
        const { angleGizmo, lengthGizmo, radiusGizmo, params } = this;
        const { p2, p1 } = params;

        const axis = new THREE.Vector3().copy(p2).sub(p1);

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
            cb(params);
        });

        return super.execute(cb, Mode.Persistent);
    }

    get shouldRescaleOnZoom() { return false }
}

class SpiralAngleGizmo extends AngleGizmo {
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }
}