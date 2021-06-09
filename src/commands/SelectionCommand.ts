import * as THREE from 'three';
import * as gizmo from '../commands/AbstractGizmo';
import * as cmd from '../commands/Command';
import Command, { ExtrudeRegionCommand } from '../commands/Command';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { HasSelection } from '../selection/SelectionManager';

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: GeometryDatabase;
    materials: MaterialDatabase;
    execute(command: Command, silent: boolean): Promise<void>;
    cancel(): void;
}

export class SelectionCommandManager {
    private _enabled = true;
    private activeCommand?: Command;

    constructor(private readonly editor: EditorLike) {
        editor.signals.selectionChanged.add(({ selection, point }) => this.selectionChanged(selection, point));
        editor.signals.commandStarted.add(c => this.enabled = false);
        editor.signals.commandEnded.add(c => this.enabled = true);
    }

    private async selectionChanged(selection: HasSelection, point?: THREE.Vector3) {
        if (!this._enabled) return;
        this.cancel();

        if (selection.selectedRegions.size > 0) {
            const command = new ExtrudeRegionCommand(this.editor);
            command.point = point;
            this.activeCommand = command;
            await this.editor.execute(command, true);
            this.activeCommand = undefined;
        }
    }

    private set enabled(enabled: boolean) {
        this._enabled = enabled;
        if (enabled) {
            this.selectionChanged(this.editor.selection);
        } else {
            this.cancel();
        }
    }

    private cancel() {
        this.activeCommand?.cancel();
        this.activeCommand = undefined;
    }
}
