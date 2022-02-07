import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { DistanceGizmo } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { EditBoxParams } from "./BoxFactory";

const x = new THREE.Vector3();
const y = new THREE.Vector3();
const z = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class EditBoxGizmo extends CompositeGizmo<EditBoxParams> {
    private readonly widthGizmo = new ExtrudeDistanceGizmo("box:width", this.editor);
    private readonly lengthGizmo = new ExtrudeDistanceGizmo("box:length", this.editor);
    private readonly heightGizmo = new ExtrudeDistanceGizmo("box:height", this.editor);

    basis!: THREE.Matrix4;

    protected prepare(mode: Mode) {
        const { widthGizmo, lengthGizmo, heightGizmo, params, basis } = this;
        basis.extractBasis(x, y, z);

        widthGizmo.relativeScale.setScalar(0.8);
        lengthGizmo.relativeScale.setScalar(0.8);
        heightGizmo.relativeScale.setScalar(0.8);

        widthGizmo.value = params.width;
        widthGizmo.quaternion.setFromUnitVectors(Y, x);
        lengthGizmo.value = params.length
        lengthGizmo.quaternion.setFromUnitVectors(Y, y);
        heightGizmo.value = params.height
        heightGizmo.quaternion.setFromUnitVectors(Y, z);

        this.add(widthGizmo, lengthGizmo, heightGizmo);
    }

    execute(cb: (params: EditBoxParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { widthGizmo, lengthGizmo, heightGizmo, params } = this;

        this.addGizmo(widthGizmo, width => {
            params.width = width;
        });

        this.addGizmo(lengthGizmo, length => {
            params.length = length;
        });

        this.addGizmo(heightGizmo, height => {
            params.height = height;
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return false }

    render(params: EditBoxParams) {
        this.widthGizmo.value = params.width;
        this.lengthGizmo.value = params.length;
        this.heightGizmo.value = params.height;
    }
}

class ExtrudeDistanceGizmo extends DistanceGizmo {
    protected override minShaft = 0;
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }
}
