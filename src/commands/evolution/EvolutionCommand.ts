import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { EvolutionDialog } from "./EvolutionDialog";
import { EvolutionFactory } from "./EvolutionFactory";

export class EvolutionCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const evolution = new EvolutionFactory(editor.db, editor.materials, editor.signals).resource(this);

        const dialog = new EvolutionDialog(evolution, editor.signals);
        let objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);

        dialog.execute(async (params) => {
            await evolution.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const getRegion = dialog.prompt("Select region", () => {
            return objectPicker.shift(SelectionMode.Region, 1, 1).resource(this);
        });
        const region = await getRegion();
        evolution.regions = [...region];

        const getSpine = dialog.prompt("Select curve", () => {
            return objectPicker.shift(SelectionMode.Curve, 1, 1).resource(this);
        });
        const spine = await getSpine();
        evolution.spine = spine.first;
        evolution.update();

        await this.finished;

        const evolved = await evolution.commit();
        editor.selection.selected.add(evolved);
    }
}