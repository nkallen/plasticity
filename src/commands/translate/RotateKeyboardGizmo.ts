import * as cmd from "../../command/CommandKeyboardInput";
import { CommandKeyboardInput } from "../../command/CommandKeyboardInput";
import * as pp from "../../command/PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class RotateKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rotate', editor, [
            'gizmo:rotate:free',
            'gizmo:rotate:pivot',
        ]);
    }
}