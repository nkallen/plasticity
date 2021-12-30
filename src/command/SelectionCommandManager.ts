import * as gizmo from '../command/AbstractGizmo';
import Command, * as cmd from '../command/Command';
import { FilletSolidCommand, ModifyContourCommand } from '../commands/GeometryCommands';
import { ModifyFaceCommand } from "../commands/modifyface/ModifyFaceCommand";
import { ExtrudeCommand } from "../commands/extrude/ExtrudeCommand";
import { DatabaseLike } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ClickChangeSelectionCommand } from '../selection/ViewportSelector';

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: DatabaseLike;
    materials: MaterialDatabase;
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
}

export class SelectionCommandManager {
    constructor(private readonly editor: EditorLike) { }

    commandFor(command?: Command): Command | undefined {
        const point = command instanceof ClickChangeSelectionCommand ? command.point : undefined;
        const selected = this.editor.selection.selected;

        if (selected.regions.size > 0) {
            const command = new ExtrudeCommand(this.editor);
            command.point = point;
            return command;
        } else if (selected.faces.size > 0) {
            const command = new ModifyFaceCommand(this.editor);
            command.point = point;
            return command;
        } else if (selected.edges.size > 0) {
            const command = new FilletSolidCommand(this.editor);
            command.point = point;
            return command;
        } else if (selected.curves.size > 0) {
            const command = new ModifyContourCommand(this.editor);
            return command;
        }
    }
}
