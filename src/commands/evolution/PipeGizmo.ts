import * as THREE from "three";
import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { DistanceGizmo } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { MagnitudeGizmo } from "../extrude/ExtrudeGizmo";
import { PipeParams } from "./PipeFactory";

const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);

export class PipeGizmo extends CompositeGizmo<PipeParams> {
    private readonly sectionSizeGizmo = new SectionSizeGizmo("pipe:section-size", this.editor);

    private readonly thicknessGizmo = new MagnitudeGizmo("pipe:thickness", this.editor);

    protected prepare(mode: Mode) {
        const { sectionSizeGizmo, thicknessGizmo } = this;
        sectionSizeGizmo.relativeScale.setScalar(0.8);
        thicknessGizmo.relativeScale.setScalar(0.8);

        thicknessGizmo.quaternion.setFromUnitVectors(Z, Y);
        
        this.add(sectionSizeGizmo, thicknessGizmo);
    }

    execute(cb: (params: PipeParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { sectionSizeGizmo, thicknessGizmo, params } = this;

        sectionSizeGizmo.value = params.sectionSize;
        thicknessGizmo.value = params.thickness1;

        this.addGizmo(sectionSizeGizmo, size => {
            params.sectionSize = size;
        });

        this.addGizmo(thicknessGizmo, thickness => {
            params.thickness1 = thickness;
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return false }

    render(params: PipeParams) {
        this.sectionSizeGizmo.render(1);
        this.thicknessGizmo.render(params.thickness1);
    }
}

class SectionSizeGizmo extends DistanceGizmo {
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }

    render(length: number) {
        super.render(length - 0.9);
    }

    get shouldRescaleOnZoom() { return false }
}