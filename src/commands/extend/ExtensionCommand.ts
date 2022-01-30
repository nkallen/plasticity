import Command from "../../command/Command";
import { ExtensionShellDialog } from "./ExtensionShellDialog";
import ExtensionShellFactory from "./ExtensionShellFactory";
import { ExtensionShellGizmo } from "./ExtensionShellGizmo";

export class ExtensionShellCommand extends Command {
    async execute(): Promise<void> {
        const extension = new ExtensionShellFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        extension.faces = [...this.editor.selection.selected.faces];
        extension.edges = [...this.editor.selection.selected.edges];

        const dialog = new ExtensionShellDialog(extension, this.editor.signals);
        const gizmo = new ExtensionShellGizmo("extension-shell:distance", this.editor);

        dialog.execute(async (params) => {
            await extension.update();
            gizmo.render(params.distance);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.execute(distance => {
            extension.distance = distance;
            extension.update();
            dialog.render();
        }).resource(this);

        await this.finished;

        extension.commit();
    }
}
