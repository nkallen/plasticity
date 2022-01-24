import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { AngleGizmo } from "../../command/MiniGizmos";
import { CancellablePromise } from "../../util/CancellablePromise";
import { MagnitudeGizmo } from "../extrude/ExtrudeGizmo";
import { RevolutionParams } from './RevolutionFactory';


export class RevolutionGizmo extends CompositeGizmo<RevolutionParams> {
    private readonly thickness = new RevolutionMagnitudeGizmo("revolution:thickness", this.editor);
    private readonly angle = new RevolutionAngleGizmo("revolution:angle", this.editor, this.editor.gizmos.white);

    prepare() {
        const { thickness, angle, params } = this;

        this.angle.relativeScale.setScalar(0.3);

        this.add(thickness, angle);
    }

    execute(cb: (params: RevolutionParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { thickness, angle, params } = this;

        this.addGizmo(thickness, distance => {
            params.thickness = distance;
        });

        this.addGizmo(angle, angle => {
            params.side1 = angle;
        });

        return super.execute(cb, finishFast);
    }

    render(params: RevolutionParams) {
        // this.angle.render(params.side1);
        this.thickness.render(params.thickness1);
    }

    get shouldRescaleOnZoom() { return false }
}

class RevolutionMagnitudeGizmo extends MagnitudeGizmo {
}

class RevolutionAngleGizmo extends AngleGizmo {
    onInterrupt(cb: (radius: number) => void) {
        this.state.push();
    }
}