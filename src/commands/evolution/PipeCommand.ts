import Command from "../../command/Command";
import { PipeDialog } from "./PipeDialog";
import { PipeFactory } from "./PipeFactory";
import { PipeGizmo } from "./PipeGizmo";
import { PipeKeyboardGizmo } from "./PipeKeyboardGizmo";
import * as THREE from 'three';

const Y = new THREE.Vector3(0, 1, 0);

export class PipeCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const spine = editor.selection.selected.curves.first;
        const pipe = new PipeFactory(editor.db, editor.materials, editor.signals).resource(this);
        pipe.spine = spine;

        const dialog = new PipeDialog(pipe, editor.signals);
        const gizmo = new PipeGizmo(pipe, this.editor);
        const keyboard = new PipeKeyboardGizmo(this.editor);

        dialog.execute(async (params) => {
            await pipe.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        gizmo.position.copy(pipe.origin);
        gizmo.quaternion.setFromUnitVectors(Y, pipe.direction);
        gizmo.execute(params => {
            pipe.update();
            dialog.render();
        }).resource(this);

        keyboard.execute(e => {
            switch (e) {
                case 'add-vertex':
                    pipe.vertexCount++;
                    break;
                case 'subtract-vertex':
                    pipe.vertexCount--;
                    break;
            }
            pipe.update();
        }).resource(this);

        await pipe.update();

        await this.finished;

        const evolved = await pipe.commit();
        editor.selection.selected.add(evolved);
    }
}
