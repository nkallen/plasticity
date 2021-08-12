import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export class CircleKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('circle', editor, [
            'gizmo:circle:mode',
        ]);
    }
}