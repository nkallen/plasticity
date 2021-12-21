import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class CircleKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('circle', editor, [
            'gizmo:circle:mode',
        ]);
    }
}