import Command from "../../command/Command";
import { EvolutionDialog } from "./EvolutionDialog";
import { EvolutionFactory } from "./EvolutionFactory";
export class EvolutionCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const spine = editor.selection.selected.curves.first;
        const regions = [...editor.selection.selected.regions];
        const evolution = new EvolutionFactory(editor.db, editor.materials, editor.signals).resource(this);
        evolution.spine = spine;
        evolution.regions = regions;

        const dialog = new EvolutionDialog(evolution, editor.signals);

        dialog.execute(async (params) => {
            await evolution.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await evolution.update()

        await this.finished;

        const evolved = await evolution.commit();
        editor.selection.selected.add(evolved);
    }
}