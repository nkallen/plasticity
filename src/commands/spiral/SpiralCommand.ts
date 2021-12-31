import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import LineFactory from '../line/LineFactory';
import { SpiralFactory } from "./SpiralFactory";
import { SpiralGizmo } from "./SpiralGizmo";


export class SpiralCommand extends Command {
    async execute(): Promise<void> {
        const spiral = new SpiralFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        spiral.p1 = p1;

        const line = new LineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        line.p1 = p1;
        const { point: p2 } = await pointPicker.execute(({ point }) => {
            line.p2 = point;
            line.update();
        }).resource(this);
        line.cancel();
        spiral.p2 = p2;

        pointPicker.straightSnaps.delete(AxisSnap.Z);
        pointPicker.restrictToPlaneThroughPoint(p2);

        await pointPicker.execute(({ point }) => {
            spiral.radius = point.distanceTo(p2);
            spiral.p3 = point;
            spiral.update();
        }).resource(this);

        const spiralGizmo = new SpiralGizmo(spiral, this.editor);
        spiralGizmo.execute(params => {
            spiral.update();
        }).resource(this);

        await this.finished;

        const result = await spiral.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}
