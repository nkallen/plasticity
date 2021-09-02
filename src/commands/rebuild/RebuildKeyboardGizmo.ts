import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export class RebuildKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('rebuild', editor, [
            'gizmo:rebuild:forward',
            'gizmo:rebuild:backward',
        ]);
    }
}