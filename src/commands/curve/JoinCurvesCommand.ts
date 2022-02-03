import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import JoinCurvesFactory from './JoinCurvesFactory';



export class JoinCurvesCommand extends Command {
    async execute(): Promise<void> {
        const contour = new JoinCurvesFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        for (const curve of this.editor.selection.selected.curves)
            contour.push(curve);
        const results = await contour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        this.editor.selection.selected.addCurve(results[0]);
    }
}
