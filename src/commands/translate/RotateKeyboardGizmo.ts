import * as cmd from "../CommandKeyboardInput";
import { CommandKeyboardInput } from "../CommandKeyboardInput";
import * as pp from "../PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class RotateKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rotate', editor, [
            'gizmo:rotate:free',
        ]);
    }
}