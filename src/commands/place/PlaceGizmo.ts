import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { CancellablePromise } from "../../util/CancellablePromise";
import { MirrorMoveGizmo } from "../mirror/MirrorGizmo";
import { AxisAngleGizmo } from "../translate/RotateGizmo";
import { ScaleAxisGizmo } from "../translate/ScaleGizmo";
import { PlaceParams } from "./PlaceFactory";

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
export class PlaceGizmo extends CompositeGizmo<PlaceParams> {
    private readonly materials = this.editor.gizmos;
    private readonly blue = this.materials.blue;
    private readonly yellow = this.materials.yellow;
    private readonly z = new ScaleAxisGizmo("place:scale", this.editor, this.blue);
    private readonly offset = new MirrorMoveGizmo("place:offset", this.editor, this.yellow);
    private readonly angle = new AxisAngleGizmo("place:angle", this.editor, this.blue);

    readonly pivot = new THREE.Vector3();

    protected prepare(mode: Mode) {
        const { z, angle, offset } = this;

        for (const o of [z, angle, offset]) o.relativeScale.setScalar(0.8);

        z.quaternion.setFromUnitVectors(Y, Z);
        offset.quaternion.copy(z.quaternion).invert();

        this.pivot.copy(this.position);
        this.add(z, angle, offset);
        offset.visible = false;
    }

    execute(cb: (params: PlaceParams) => void, mode: Mode = Mode.Persistent): CancellablePromise<void> {
        const { z, angle, params, offset: move } = this;

        this.addGizmo(z, scale => {
            params.scale = scale;
        });

        this.addGizmo(angle, angle => {
            params.angle = angle;
        });

        this.addGizmo(move, offset => {
            params.offset = -offset;
            move.position.set(0, 0, -offset);
        });

        return super.execute(cb, mode);
    }

    override enable() {
        super.enable();
        this.offset.visible = true;
    }

    render(params: PlaceParams) {
        this.position.copy(params.destination);
    }
}