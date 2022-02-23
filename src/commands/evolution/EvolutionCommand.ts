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
        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.copy(this.editor.selection);

        dialog.execute(async (params) => {
            await evolution.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        const getRegion = dialog.prompt("Select region or face", () => {
            const objectPicker = new ObjectPicker(this.editor);
            objectPicker.mode.set(SelectionMode.Face, SelectionMode.Region);
            objectPicker.copy(this.editor.selection);
            const min = 1 - objectPicker.selection.selected.regions.size - objectPicker.selection.selected.faces.size;
            return objectPicker.execute(() => { }, min, 1).resource(this)
        });
        const selection = await getRegion();
        if (selection.faces.size > 0) evolution.face = selection.faces.first;
        else if (selection.regions.size > 0) evolution.region = selection.regions.first;

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