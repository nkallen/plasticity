import * as THREE from "three";
import { CancellablePromise } from "../../util/Cancellable";
import { mode } from "../AbstractGizmo";
import { CompositeGizmo } from "../CompositeGizmo";
import { CircleMoveGizmo, MoveAxisGizmo, PlanarMoveGizmo } from "../MiniGizmos";
import { MoveParams } from "./TranslateFactory";

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
    private readonly x = new MoveAxisGizmo("move:x", this.editor, this.red);
    private readonly y = new MoveAxisGizmo("move:y", this.editor, this.green);
    private readonly z = new MoveAxisGizmo("move:z", this.editor, this.blue);
    private readonly xy = new PlanarMoveGizmo("move:xy", this.editor, this.yellow);
    private readonly yz = new PlanarMoveGizmo("move:yz", this.editor, this.cyan);
    private readonly xz = new PlanarMoveGizmo("move:xz", this.editor, this.magenta);
    private readonly screen = new CircleMoveGizmo("move:screen", this.editor);

    execute(cb: (params: MoveParams) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
        const { x, y, z, xy, yz, xz, screen, params } = this;

        x.quaternion.setFromUnitVectors(Y, X);
        y.quaternion.setFromUnitVectors(Y, Y);
        z.quaternion.setFromUnitVectors(Y, Z);

        yz.quaternion.setFromUnitVectors(Z, _X);
        xz.quaternion.setFromUnitVectors(Z, _Y);

        this.add(x, y, z, xy, yz, xz, screen);

        const set = () => {
            const delta = new THREE.Vector3(x.magnitude, y.magnitude, z.magnitude);
            delta.add(screen.value);
            delta.add(xy.value);
            delta.add(yz.value);
            delta.add(xz.value);
            params.move = delta;
        }

        this.addGizmo(x, set);
        this.addGizmo(y, set);
        this.addGizmo(z, set);
        this.addGizmo(xy, set);
        this.addGizmo(yz, set);
        this.addGizmo(xz, set);
        this.addGizmo(screen, set);

        return super.execute(cb, finishFast);
    }
}