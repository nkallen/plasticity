import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import { PossiblyBooleanKeyboardGizmo } from "../boolean/BooleanKeyboardGizmo";
import { CenterCircleFactory } from '../circle/CircleFactory';
import { PossiblyBooleanCylinderFactory } from './CylinderFactory';


export class CylinderCommand extends Command {
    async execute(): Promise<void> {
        const cylinder = new PossiblyBooleanCylinderFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const selection = this.editor.selection.selected;
        if (selection.solids.size > 0)
            cylinder.target = selection.solids.first;

        const circle = new CenterCircleFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        let pointPicker = new PointPicker(this.editor);
        pointPicker.straightSnaps.delete(AxisSnap.Z);
        const { point: p1, info: { snap } } = await pointPicker.execute().resource(this);
        circle.center = p1;
        pointPicker.restrictToPlaneThroughPoint(p1, snap);

        const { point: p2 } = await pointPicker.execute(({ point: p2, info: { orientation } }) => {
            circle.point = p2;
            circle.orientation = orientation;
            circle.update();
        }).resource(this);
        circle.cancel();

        cylinder.base = p1;
        cylinder.radius = p2;

        const keyboard = new PossiblyBooleanKeyboardGizmo("cylinder", this.editor);
        keyboard.prepare(cylinder).resource(this);

        pointPicker = new PointPicker(this.editor);
        pointPicker.addSnap(...snap.additionalSnapsFor(p1));
        pointPicker.addAxesAt(p1);
        await pointPicker.execute(({ point: p3 }) => {
            cylinder.height = p3;
            cylinder.update();
            keyboard.toggle(cylinder.isOverlapping);
        }).resource(this);

        const result = await cylinder.commit() as visual.Solid;
        selection.addSolid(result);
    }
}
