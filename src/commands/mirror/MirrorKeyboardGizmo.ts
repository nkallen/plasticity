import * as cmd from "../../command/CommandKeyboardInput";
import { CommandKeyboardInput } from "../../command/CommandKeyboardInput";
import * as pp from "../../command/PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class MirrorKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('mirror', editor, [
            'gizmo:mirror:free',
        ]);
    }
}