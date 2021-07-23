import * as THREE from 'three';
import * as gizmo from './AbstractGizmo';
import * as cmd from './Command';
import Command from './Command';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ChangeSelectionCommand } from './CommandLike';
import { CancelOrFinish } from './CommandExecutor';
import { ChangePointCommand, ExtrudeRegionCommand, FilletCommand, OffsetFaceCommand } from './GeometryCommands';

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: GeometryDatabase;
    materials: MaterialDatabase;
    enqueue(command: Command, cancelOrFinish?: CancelOrFinish): void;
}

export class SelectionCommandManager {
    constructor(private readonly editor: EditorLike) { }

    commandFor(command?: Command): Command | undefined {
        const point = command instanceof ChangeSelectionCommand ? command.intersection?.point : new THREE.Vector3();

        if (this.editor.selection.selectedRegions.size > 0) {
            const command = new ExtrudeRegionCommand(this.editor);
            command.point = point;
            return command;
        } else if (this.editor.selection.selectedFaces.size > 0) {
            return new OffsetFaceCommand(this.editor);
        } else if (this.editor.selection.selectedEdges.size > 0) {
            return new FilletCommand(this.editor);
        } else if (this.editor.selection.selectedControlPoints.size > 0) {
            return new ChangePointCommand(this.editor);
        }
    }
}
