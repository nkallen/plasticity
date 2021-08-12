import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { CircleMagnitudeGizmo, MoveAxisGizmo, PlanarMagnitudeGizmo } from "../MiniGizmos";
import { MoveParams, ScaleParams } from "./TranslateFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export class MoveGizmo extends CompositeGizmo<MoveParams> {
    private readonly materials = this.editor.gizmos;
    private readonly red = { tip: this.materials.red, shaft: this.materials.lineRed };
    private readonly green = { tip: this.materials.green, shaft: this.materials.lineGreen };
    private readonly blue = { tip: this.materials.blue, shaft: this.materials.lineBlue };
    private readonly yellow = this.materials.yellowTransparent;
    private readonly magenta = this.materials.magentaTransparent;
    private readonly cyan = this.materials.cyanTransparent;
    private readonly x = new MoveAxisGizmo("scale:x", this.editor, this.red);
    private readonly y = new MoveAxisGizmo("scale:y", this.editor, this.green);
    private readonly z = new MoveAxisGizmo("scale:z", this.editor, this.blue);
    private readonly xy = new PlanarMagnitudeGizmo("scale:xy", this.editor, this.yellow);
    private readonly yz = new PlanarMagnitudeGizmo("scale:yz", this.editor, this.cyan);
    private readonly xz = new PlanarMagnitudeGizmo("scale:xz", this.editor, this.magenta);
    private readonly xyz = new CircleMagnitudeGizmo("scale:xyz", this.editor);

    execute(cb: (params: MoveParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, xy, yz, xz, xyz, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        yz.quaternion.setFromUnitVectors(Z, _X);
        xz.quaternion.setFromUnitVectors(Z, _Y);

        this.add(x, y, z, xy, yz, xz, xyz);

        const set = () => {
            const delta = new THREE.Vector3(x.magnitude, y.magnitude, z.magnitude);
            params.move = delta;
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