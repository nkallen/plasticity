import * as cmd from "../../command/CommandKeyboardInput";
import { CommandKeyboardInput } from "../../command/CommandKeyboardInput";
import * as pp from "../../command/point-picker/PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class RotateKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rotate', editor, [
            'keyboard:rotate:free',
            'keyboard:rotate:pivot',
        ]);
    }
}