import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class RebuildKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rebuild', editor, [
            'gizmo:rebuild:forward',
            'gizmo:rebuild:backward',
        ]);
    }
}