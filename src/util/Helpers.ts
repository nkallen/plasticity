import * as THREE from 'three';
import * as gizmo from '../commands/AbstractGizmo';
import * as cmd from '../commands/Command';
import Command, { ExtrudeRegionCommand } from '../commands/Command';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import MaterialDatabase from '../MaterialDatabase';
import { HasSelection } from '../selection/SelectionManager';
import { CancellablePromise } from './Cancellable';

// Helpers are little visualization tools like gizmos that should
// be rendered as a separate pass from the main scene.

export interface EditorLike extends gizmo.EditorLike, cmd.EditorLike {
    db: GeometryDatabase;
    materials: MaterialDatabase;
    execute(command: Command): Promise<void>;
}

export interface Helper extends THREE.Object3D {
    update(camera: THREE.Camera): void;
}

export class Helpers {
    readonly scene = new THREE.Scene();
    private p?: Command;

    constructor(signals: EditorSignals, private readonly editor: EditorLike) {
        this.update = this.update.bind(this);
        this.selectionChanged = this.selectionChanged.bind(this);

        signals.renderPrepared.add(({ camera }) => this.update(camera));
        signals.selectionChanged.add(({ selection, point }) => this.selectionChanged(selection, point));
    }

    add(...object: Helper[]) {
        this.scene.add(...object);
    }

    remove(...object: Helper[]) {
        this.scene.remove(...object);
    }

    update(camera: THREE.Camera) {
        for (const child of this.scene.children) {
            const helper = child as Helper;
            helper.update(camera);
        }
    }

    // pass point and normal;
    // think about what ESC means
    // initiating a command needs to cancel this
    // finsihing a command needs to cancel this;

    private async selectionChanged(selection: HasSelection, point?: THREE.Vector3) {
        this.p?.cancel(); // *mainly used when deselecting*
        this.p = undefined;
        if (selection.selectedRegions.size > 0) {
            const command = new ExtrudeRegionCommand(this.editor);
            this.p = command;
            await this.editor.execute(command);
            this.p = undefined;
        }
    }
}