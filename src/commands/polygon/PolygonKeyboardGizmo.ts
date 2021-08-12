import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type PolygonKeyboardEvent = { tag: 'add-vertex' } | { tag: 'subtract-vertex' }

export class PolygonKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('polygon', editor, [
            'gizmo:polygon:add-vertex',
            'gizmo:polygon:subtract-vertex',
        ]);
    }
}