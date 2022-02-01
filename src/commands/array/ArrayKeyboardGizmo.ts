import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class ArrayKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('array', editor, [
            'gizmo:array:add',
            'gizmo:array:subtract',
        ]);
    }
}