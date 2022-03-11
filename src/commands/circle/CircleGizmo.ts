import { Mode } from "../../command/AbstractGizmo";
import { CompositeGizmo } from "../../command/CompositeGizmo";
import { CancellablePromise } from "../../util/CancellablePromise";
import { RadiusDistanceGizmo } from "../cylinder/CylinderGizmo";
import { EditCircleParams } from "./CircleFactory";

export class CircleGizmo extends CompositeGizmo<EditCircleParams> {
    private readonly radiusGizmo = new RadiusDistanceGizmo("circle:radius", this.editor);

    protected prepare(mode: Mode) {
        const { radiusGizmo, params } = this;
        radiusGizmo.relativeScale.setScalar(0.8);
        radiusGizmo.value = params.radius;
        this.add(radiusGizmo);
    }

    execute(cb: (params: EditCircleParams) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { radiusGizmo,  params } = this;

        this.addGizmo(radiusGizmo, radius => {
            params.radius = radius;
        });

        return super.execute(cb, finishFast);
    }

    get shouldRescaleOnZoom() { return false }

    render(params: EditCircleParams) {
        this.radiusGizmo.value = params.radius;
    }
}
