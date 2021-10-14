import MaterialDatabase from "../../editor/MaterialDatabase";
import { CancellablePromise } from "../../util/Cancellable";
import * as cmd from "../CommandKeyboardInput";
import { CommandKeyboardInput } from "../CommandKeyboardInput";
import { MoveCommand } from "../GeometryCommands";
import LineFactory from "../line/LineFactory";
import * as pp from "../PointPicker";
import { PointPicker } from "../PointPicker";
import { MoveDialog } from "./MoveDialog";
import { MoveGizmo } from "./MoveGizmo";
import { MoveFactory } from "./TranslateFactory";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
    materials: MaterialDatabase,
}

export class MoveKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('move', editor, [
            'gizmo:move:free',
        ]);
    }

    prepare(gizmo: MoveGizmo, move: MoveFactory, dialog: MoveDialog, cmd: MoveCommand): CancellablePromise<void> {
        const editor = this.editor as EditorLike;
        return this.execute(async s => {
            switch (s) {
                case 'free':
                    gizmo.visible = false;
                    const line = new LineFactory(editor.db, editor.materials, editor.signals).resource(cmd);
                    const pointPicker = new PointPicker(editor);
                    const { point: p1 } = await pointPicker.execute().resource(cmd);
                    line.p1 = p1;
                    await pointPicker.execute(({ point: p2 }) => {
                        line.p2 = p2;
                        move.move = p2.clone().sub(p1);
                        move.update();
                        line.update();
                        dialog.render();
                        gizmo.render(move);
                    }).resource(cmd);
                    line.cancel();
                    gizmo.visible = true;
                    break;
            }
        })
    }
}