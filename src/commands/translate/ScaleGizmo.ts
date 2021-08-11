import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { mode } from "../AbstractGizmo";
import { CompositeGizmo, DistanceGizmo } from "../MiniGizmos";
import { ScaleParams } from "./TranslateFactory";

const X = new THREE.Vector3(1,0,0);
const Y = new THREE.Vector3(0,1,0);
const Z = new THREE.Vector3(0,0,1);

export class ScaleGizmo extends CompositeGizmo<ScaleParams> {
    private readonly x = new DistanceGizmo("scale:x", this.editor);
    private readonly y = new DistanceGizmo("scale:y", this.editor);
    private readonly z = new DistanceGizmo("scale:z", this.editor);

    execute(cb: (params: ScaleParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        this.add(x, y, z);

        this.addGizmo(x, scale => {
            params.scale.x = scale;
        });

        this.addGizmo(y, scale => {
            params.scale.y = scale;
        });

        this.addGizmo(z, scale => {
            params.scale.z = scale;
        });

        return super.execute(cb, finishFast);
    }
}