import { CommandKeyboardInput, EditorLike } from "../../command/CommandKeyboardInput";

export type BooleanKeyboardEvent = { tag: 'boolean', type: number } | { tag: 'new-body' }

export class OffsetFaceKeyboardGizmo  extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('move', editor, [
            'gizmo:offset-face:toggle',
        ]);
    }
}
