import * as cmd from "../CommandKeyboardInput";
import { CommandKeyboardInput } from "../CommandKeyboardInput";
import * as pp from "../PointPicker";

interface EditorLike extends cmd.EditorLike, pp.EditorLike {
}

export class MirrorKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('mirror', editor, [
            'gizmo:mirror:free',
        ]);
    }
}