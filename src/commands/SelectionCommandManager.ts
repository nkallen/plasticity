import * as THREE from 'three';
import { DatabaseLike, GeometryDatabase } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as gizmo from './AbstractGizmo';
import Command, * as cmd from './Command';
import { CancelOrFinish } from './CommandExecutor';
import { ClickChangeSelectionCommand } from './CommandLike';
import { ChangePointCommand, ExtrudeCommand, FilletCommand, OffsetFaceCommand } from './GeometryCommands';

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: DatabaseLike;
    materials: MaterialDatabase;
    enqueue(command: Command, cancelOrFinish?: CancelOrFinish): Promise<void>;
}

export class SelectionCommandManager {
    constructor(private readonly editor: EditorLike) { }

    commandFor(command?: Command): Command | undefined {
        const point = command instanceof ClickChangeSelectionCommand ? command.intersection?.point : undefined;
        const selected = this.editor.selection.selected;

        if (selected.regions.size > 0) {
            const command = new ExtrudeCommand(this.editor);
            command.point = point;
            return command;
        } else if (selected.faces.size > 0) {
            const command = new OffsetFaceCommand(this.editor);
            command.point = point;
            return command;
        } else if (selected.edges.size > 0) {
            const command = new FilletCommand(this.editor);
            command.point = point;
            return command;
        } else if (selected.controlPoints.size > 0) {
            return new ChangePointCommand(this.editor);
        }
    }
}
