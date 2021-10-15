import * as cmd from "../CommandKeyboardInput";
import { CommandKeyboardInput } from "../CommandKeyboardInput";
import * as pp from "../PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class MoveKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('move', editor, [
            'gizmo:move:free',
        ]);
    }
}