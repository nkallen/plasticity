import * as THREE from "three";
import Command from "../../command/Command";
import * as visual from "../../visual_model/VisualModel";
import { FilletFaceFactory } from "./ModifyFaceFactory";
import { OffsetFaceDialog } from "./OffsetFaceDialog";
import { MultiOffsetFactory } from "./OffsetFaceFactory";
import { OffsetFaceGizmo } from "./OffsetFaceGizmo";
import { OffsetFaceKeyboardGizmo } from "./OffsetFaceKeyboardGizmo";
import { RefilletGizmo } from "./RefilletGizmo";


export class ModifyFaceCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const fillet = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const shouldRefillet = fillet.areFilletFaces(faces);
        const command = shouldRefillet ? new RefilletFaceCommand(this.editor) : new OffsetFaceCommand(this.editor);
        command.point = this.point;
        this.editor.enqueue(command, true);
    }
}

export class OffsetFaceCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const selected = this.editor.selection.selected;

        const offset = new MultiOffsetFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        const faces = [...selected.faces];
        offset.faces = faces;

        const gizmo = new OffsetFaceGizmo(offset, this.editor, this.point);
        const dialog = new OffsetFaceDialog(offset, this.editor.signals);
        const keyboard = new OffsetFaceKeyboardGizmo(this.editor);

        gizmo.execute(async (params) => {
            await offset.update();
            dialog.render();
        }).resource(this);

        dialog.execute(async (params) => {
            await offset.update();
        }).resource(this).then(() => this.finish(), () => this.cancel());

        keyboard.execute(s => {
            switch (s) {
                case 'toggle':
                    offset.toggle();
                    offset.update();
            }
        }).resource(this);

        await this.finished;

        const results = await offset.commit() as visual.Solid[];
        selected.add(results);

        for (const face of selected.faces) selected.removeFace(face);
    }
}

export class RefilletFaceCommand extends Command {
    point?: THREE.Vector3;

    async execute(): Promise<void> {
        const faces = [...this.editor.selection.selected.faces];
        const parent = faces[0].parentItem as visual.Solid;

        const factory = new FilletFaceFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.solid = parent;
        factory.faces = faces;

        const gizmo = new RefilletGizmo(factory, this.editor, this.point);

        gizmo.execute(async (params) => {
            await factory.update();
        }).resource(this);

        await this.finished;

        const result = await factory.commit() as visual.Solid;
        this.editor.selection.selected.addSolid(result);
    }
}
