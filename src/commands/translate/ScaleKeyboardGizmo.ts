import * as cmd from "../../command/CommandKeyboardInput";
import { CommandKeyboardInput } from "../../command/CommandKeyboardInput";
import * as pp from "../../command/PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class ScaleKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('scale', editor, [
            'keyboard:scale:free',
            'keyboard:scale:pivot',
        ]);
    }
}