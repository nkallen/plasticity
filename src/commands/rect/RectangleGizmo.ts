import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { DistanceGizmo } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { EditRectangleParams } from "./RectangleFactory";

const x = new THREE.Vector3();
const y = new THREE.Vector3();
const z = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);

export class EditRectangleGizmo extends CompositeGizmo<EditRectangleParams> {
    private readonly widthGizmo = new ExtrudeDistanceGizmo("rectangle:width", this.editor);
    private readonly lengthGizmo = new ExtrudeDistanceGizmo("rectangle:length", this.editor);

    basis!: THREE.Matrix4;

    protected prepare(mode: Mode) {
        const { widthGizmo, lengthGizmo,  params, basis } = this;
        basis.extractBasis(x, y, z);

        widthGizmo.relativeScale.setScalar(0.8);
        lengthGizmo.relativeScale.setScalar(0.8);

        widthGizmo.value = params.width;
        widthGizmo.quaternion.setFromUnitVectors(Y, x);
        lengthGizmo.value = params.length
        lengthGizmo.quaternion.setFromUnitVectors(Y, y);

        this.add(widthGizmo, lengthGizmo);
    }

    execute(cb: (params: EditRectangleParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { widthGizmo, lengthGizmo, params } = this;

        this.addGizmo(widthGizmo, width => {
            params.width = width;
        });

        this.addGizmo(lengthGizmo, length => {
            params.length = length;
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return false }

    render(params: EditRectangleParams) {
        this.widthGizmo.value = params.width;
        this.lengthGizmo.value = params.length;
    }
}

class ExtrudeDistanceGizmo extends DistanceGizmo {
    protected override minShaft = 0;
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }
}
