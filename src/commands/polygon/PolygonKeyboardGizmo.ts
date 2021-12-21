import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export class PolygonKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('polygon', editor, [
            'gizmo:polygon:add-vertex',
            'gizmo:polygon:subtract-vertex',
            'gizmo:polygon:mode'
        ]);
    }
}