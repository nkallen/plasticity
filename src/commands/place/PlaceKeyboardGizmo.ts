import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class PlaceKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('place', editor, [
            'gizmo:place:flip',
        ]);
    }
}