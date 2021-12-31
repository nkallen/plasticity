import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { RevolutionDialog } from "./RevolutionDialog";
import RevolutionFactory from "./RevolutionFactory";
import { RevolutionGizmo } from "./RevolutionGizmo";



export class RevolutionCommand extends Command {
    async execute(): Promise<void> {
        const curves = [...this.editor.selection.selected.curves];
        const revolution = new RevolutionFactory(this.editor.db, this.editor.materials, this.editor.signals);

        revolution.curves = curves;

        const pointPicker = new PointPicker(this.editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        revolution.origin = p1;

        await pointPicker.execute(({ point: p2 }) => {
            revolution.axis = p2.clone().sub(p1);
            revolution.update();
        }).resource(this);

        const dialog = new RevolutionDialog(revolution, this.editor.signals);
        const gizmo = new RevolutionGizmo(revolution, this.editor);

        dialog.execute(async (params) => {
            await revolution.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(params => {
            revolution.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const revolved = await revolution.commit();
        this.editor.selection.selected.add(revolved);
    }
}
