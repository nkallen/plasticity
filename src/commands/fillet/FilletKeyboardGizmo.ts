import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type FilletKeyboardEvent = { tag: 'add' } | { tag: 'undo' }

export class FilletKeyboardGizmo extends CommandKeyboardInput {
    constructor(editor: EditorLike) {
        super('curve', editor, [
            'gizmo:fillet:add',
        ]);
    }
}