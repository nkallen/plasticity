import * as THREE from 'three';
import * as gizmo from './AbstractGizmo';
import * as cmd from './Command';
import Command, { ExtrudeRegionCommand, FilletCommand, OffsetFaceCommand } from './Command';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { ChangeSelectionCommand } from './CommandLike';

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: GeometryDatabase;
    materials: MaterialDatabase;
    enqueue(command: Command, silent?: boolean): void;
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
            return new FilletCommand(this.editor)
        }
    }
}
