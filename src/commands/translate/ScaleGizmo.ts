import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { mode } from "../AbstractGizmo";
import { CircleScaleGizmo, PlanarScaleGizmo, ScaleAxisGizmo } from "../MiniGizmos";
import { CompositeGizmo } from "../CompositeGizmo";
import { ScaleParams } from "./TranslateFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class ScaleGizmo extends CompositeGizmo<ScaleParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = { tip: this.materials.red, shaft: this.materials.lineRed };
    private readonly green = { tip: this.materials.green, shaft: this.materials.lineGreen };
    private readonly blue = { tip: this.materials.blue, shaft: this.materials.lineBlue };
    private readonly yellow = this.materials.yellowTransparent;
    private readonly magenta = this.materials.magentaTransparent;
    private readonly cyan = this.materials.cyanTransparent;
    private readonly x = new ScaleAxisGizmo("scale:x", this.editor, this.red);
    private readonly y = new ScaleAxisGizmo("scale:y", this.editor, this.green);
    private readonly z = new ScaleAxisGizmo("scale:z", this.editor, this.blue);
    private readonly xy = new PlanarScaleGizmo("scale:xy", this.editor, this.yellow);
    private readonly yz = new PlanarScaleGizmo("scale:yz", this.editor, this.cyan);
    private readonly xz = new PlanarScaleGizmo("scale:xz", this.editor, this.magenta);
    private readonly xyz = new CircleScaleGizmo("scale:xyz", this.editor);

    execute(cb: (params: ScaleParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, xy, yz, xz, xyz, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        yz.quaternion.setFromUnitVectors(Z, _X);
        xz.quaternion.setFromUnitVectors(Z, _Y);

        this.add(x, y, z, xy, yz, xz, xyz);

        const set = () => {
            params.scale.set(
                xy.value * xz.value * x.magnitude,
                xy.value * yz.value * y.magnitude,
                xz.value * yz.value * z.magnitude).multiplyScalar(xyz.value);
        }

        this.addGizmo(x, set);
        this.addGizmo(y, set);
        this.addGizmo(z, set);
        this.addGizmo(xy, set);
        this.addGizmo(yz, set);
        this.addGizmo(xz, set);
        this.addGizmo(xyz, set);

        return super.execute(cb, finishFast);
    }
}