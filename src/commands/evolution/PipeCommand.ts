import * as THREE from 'three';
import Command from "../../command/Command";
import { ObjectPicker } from "../../command/ObjectPicker";
import { SelectionMode } from '../../selection/SelectionModeSet';
import { PossiblyBooleanKeyboardGizmo } from "../boolean/BooleanKeyboardGizmo";
import { PipeDialog } from "./PipeDialog";
import { PossiblyBooleanPipeFactory } from "./PipeFactory";
import { PipeGizmo } from "./PipeGizmo";

const Y = new THREE.Vector3(0, 1, 0);

export class PipeCommand extends Command {
    async execute(): Promise<void> {
        const { editor } = this;
        const spine = editor.selection.selected.curves.first;
        const pipe = new PossiblyBooleanPipeFactory(editor.db, editor.materials, editor.signals).resource(this);
        pipe.spine = spine;

        const dialog = new PipeDialog(pipe, editor.signals);
        const keyboard = new PossiblyBooleanKeyboardGizmo("pipe", this.editor);
        const gizmo = new PipeGizmo(pipe, this.editor);

        keyboard.prepare(pipe).resource(this);

        dialog.execute(async (params) => {
            await pipe.update();
            gizmo.render(params);
        }).resource(this).then(() => this.finish(), () => this.cancel());

        dialog.prompt("Select target bodies", () => {
            const objectPicker = new ObjectPicker(this.editor);
            objectPicker.selection.selected.add(pipe.targets);
            return objectPicker.execute(async delta => {
                const targets = [...objectPicker.selection.selected.solids];
                pipe.targets = targets;
                await pipe.update();
                keyboard.toggle(pipe.isOverlapping);
            }, 1, Number.MAX_SAFE_INTEGER, SelectionMode.Solid).resource(this)
        }, async () => {
            pipe.targets = [];
            keyboard.toggle(pipe.isOverlapping);
            await pipe.update();
        })();

        gizmo.position.copy(pipe.origin);
        gizmo.quaternion.setFromUnitVectors(Y, pipe.direction);
        gizmo.execute(params => {
            pipe.update();
            dialog.render();
        }).resource(this);

        await pipe.update();

        await this.finished;

        const evolved = await pipe.commit();
        editor.selection.selected.add(evolved);
    }
}
