import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class ExtrudeKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('extrude', editor, [
            'keyboard:extrude:free',
            'keyboard:extrude:pivot',
        ]);
    }
}