import * as THREE from 'three';
import * as gizmo from '../commands/AbstractGizmo';
import * as cmd from '../commands/Command';
import Command, { ExtrudeRegionCommand } from '../commands/Command';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { HasSelection } from '../selection/SelectionManager';
import { ChangeSelectionCommand } from './CommandLike';

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: GeometryDatabase;
    materials: MaterialDatabase;
    enqueue(command: Command, silent?: boolean): void;
}

export class SelectionCommandManager {
    constructor(private readonly editor: EditorLike) { }

    commandFor(command: Command): Command | undefined {
        const point = command instanceof ChangeSelectionCommand ? command.intersection?.point : new THREE.Vector3();

        if (this.editor.selection.selectedRegions.size > 0) {
            const command = new ExtrudeRegionCommand(this.editor);
            command.point = point;
            return command;
        }
    }
}
