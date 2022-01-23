import Command from "../../command/Command";
import { PointPicker } from "../../command/PointPicker";
import { PhantomLineFactory } from "../line/LineFactory";
import { RevolutionDialog } from "./RevolutionDialog";
import RevolutionFactory from "./RevolutionFactory";
import { RevolutionGizmo } from "./RevolutionGizmo";

export class RevolutionCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const curves = [...editor.selection.selected.curves];
        const revolution = new RevolutionFactory(editor.db, editor.materials, editor.signals);
        revolution.curves = curves;

        const dialog = new RevolutionDialog(revolution, editor.signals);
        const gizmo = new RevolutionGizmo(revolution, editor);

        dialog.execute(async (params) => {
            await revolution.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const pointPicker = new PointPicker(editor);
        const { point: p1 } = await pointPicker.execute().resource(this);
        revolution.origin = p1;

        const line = new PhantomLineFactory(editor.db, editor.materials, editor.signals).resource(this);
        line.p1 = p1;

        await pointPicker.execute(({ point: p2 }) => {
            line.p2 = p2;
            line.update();
            revolution.axis = p2.clone().sub(p1);
            revolution.update();
        }).resource(this);
        line.cancel();

        gizmo.execute(params => {
            revolution.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        const revolved = await revolution.commit();
        editor.selection.selected.add(revolved);
    }
}
