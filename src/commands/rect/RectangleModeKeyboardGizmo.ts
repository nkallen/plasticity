import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class RectangleModeKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rectangle', editor, [
            'keyboard:rectangle:mode',
        ]);
    }
}