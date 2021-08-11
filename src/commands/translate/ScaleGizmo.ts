import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { mode } from "../AbstractGizmo";
import { CompositeGizmo, DistanceGizmo, CircleMagnitudeGizmo } from "../MiniGizmos";
import { ScaleParams } from "./TranslateFactory";

const X = new THREE.Vector3(1,0,0);
const Y = new THREE.Vector3(0,1,0);
const Z = new THREE.Vector3(0,0,1);

export class ScaleGizmo extends CompositeGizmo<ScaleParams> {
    private readonly x = new DistanceGizmo("scale:x", this.editor);
    private readonly y = new DistanceGizmo("scale:y", this.editor);
    private readonly z = new DistanceGizmo("scale:z", this.editor);
    private readonly xyz = new CircleMagnitudeGizmo("scale:xyz", this.editor);

    execute(cb: (params: ScaleParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, xyz, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        x.length = y.length = z.length = 1;

        this.add(x, y, z, xyz);

        let xScale = 1;
        this.addGizmo(x, scale => {
            params.scale.set(xScale, yScale, zScale).multiplyScalar(xyzScale);
            xScale = scale;
        });

        let yScale = 1;
        this.addGizmo(y, scale => {
            params.scale.set(xScale, yScale, zScale).multiplyScalar(xyzScale);
            yScale = scale;
        });

        let zScale = 1;
        this.addGizmo(z, scale => {
            params.scale.set(xScale, yScale, zScale).multiplyScalar(xyzScale);
            zScale = scale;
        });

        let xyzScale = 1;
        this.addGizmo(xyz, scale => {
            params.scale.set(xScale, yScale, zScale).multiplyScalar(xyzScale);
            xyzScale = scale;
        });

        return super.execute(cb, finishFast);
    }
}