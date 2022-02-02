import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class PipeKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('pipe', editor, [
            'gizmo:pipe:add-vertex',
            'gizmo:pipe:subtract-vertex',
        ]);
    }
}