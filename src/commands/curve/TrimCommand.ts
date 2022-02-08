import Command from "../../command/Command";
import { ObjectPicker } from '../../command/ObjectPicker';
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { TrimDialog } from './TrimDialog';
import TrimFactory from "./TrimFactory";

export class TrimCommand extends Command {
    async execute(): Promise<void> {
        const dialog = new TrimDialog({}, this.editor.signals);

        dialog.execute(async (params) => {
        }).resource(this).then(() => this.finish(), () => this.cancel());

        this.editor.layers.showFragments();
        this.ensure(() => this.editor.layers.hideFragments());

        const objectPicker = new ObjectPicker(this.editor);
        objectPicker.mode.set(SelectionMode.Curve);
        objectPicker.raycasterParams.Line2.threshold = 30;

        const selected = await dialog.prompt("Select curve segments", () => {
            return objectPicker.execute(delta => {
            }).resource(this);
        })();

        const factory = new TrimFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.fragments = [...selected.curves];
        await factory.commit();

        this.editor.enqueue(new TrimCommand(this.editor), false);
    }
}
