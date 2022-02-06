import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { DistanceGizmo } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { EditCylinderParams } from "./CylinderFactory";

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

export class EditCylinderGizmo extends CompositeGizmo<EditCylinderParams> {
    private readonly radiusGizmo = new RadiusDistanceGizmo("cylinder:radius", this.editor);
    private readonly heightGizmo = new ExtrudeDistanceGizmo("cylinder:height", this.editor);

    protected prepare(mode: Mode) {
        const { radiusGizmo, heightGizmo, params } = this;
        radiusGizmo.relativeScale.setScalar(0.8);
        heightGizmo.relativeScale.setScalar(0.8);

        radiusGizmo.value = params.radius;
        heightGizmo.value = params.height
        heightGizmo.quaternion.setFromUnitVectors(Y, Z);

        this.add(radiusGizmo, heightGizmo);
    }

    execute(cb: (params: EditCylinderParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { radiusGizmo, heightGizmo, params } = this;

        this.addGizmo(radiusGizmo, radius => {
            params.radius = radius;
        });

        this.addGizmo(heightGizmo, height => {
            params.height = height;
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return false }

    render(params: EditCylinderParams) {
        this.radiusGizmo.value = params.radius;
        this.heightGizmo.value = params.height;
    }
}

class ExtrudeDistanceGizmo extends DistanceGizmo {
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }

}

class RadiusDistanceGizmo extends ExtrudeDistanceGizmo {
    render(length: number) {
        super.render(length);
    }
}
