import Command from "../../command/Command";
import { MultilineDialog } from '../multiline/MultilineDialog';
import MultilineFactory from '../multiline/MultilineFactory';


export class MultilineCommand extends Command {
    async execute(): Promise<void> {
        const curve = this.editor.selection.selected.curves.first;
        const factory = new MultilineFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.curve = curve;

        const dialog = new MultilineDialog(factory, this.editor.signals);

        await factory.update();

        dialog.execute(params => {
            factory.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        await this.finished;

        await factory.commit();
    }
}
