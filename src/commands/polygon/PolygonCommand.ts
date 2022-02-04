import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { AxisSnap } from "../../editor/snaps/Snap";
import * as visual from "../../visual_model/VisualModel";
import { PolygonFactory } from "./PolygonFactory";
import { PolygonKeyboardGizmo } from "./PolygonKeyboardGizmo";


export class PolygonCommand extends Command {
    async execute(): Promise<void> {
        const polygon = new PolygonFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);

        const keyboard = new PolygonKeyboardGizmo(this.editor);
        keyboard.execute(e => {
            switch (e) {
                case 'add-vertex':
                    polygon.vertexCount++;
                    break;
                case 'subtract-vertex':
                    polygon.vertexCount--;
                    break;
                case 'mode':
                    polygon.toggleMode();
                    break;
            }
            polygon.update();
        }).resource(this);

        const pointPicker = new PointPicker(this.editor);
        pointPicker.facePreferenceMode = 'strong';
        pointPicker.straightSnaps.delete(AxisSnap.Z);

        const { point, info: { snap } } = await pointPicker.execute().resource(this);
        polygon.center = point;
        pointPicker.restrictToPlaneThroughPoint(point, snap);

        await pointPicker.execute(({ point, info: { orientation } }) => {
            polygon.orientation = orientation;
            polygon.p2 = point;
            polygon.update();
        }).resource(this);

        const result = await polygon.commit() as visual.SpaceInstance<visual.Curve3D>;
        this.editor.selection.selected.addCurve(result);
    }
}
