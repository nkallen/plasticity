import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type FilletKeyboardEvent = { tag: 'add' } | { tag: 'undo' }

export class FilletKeyboardGizmo extends CommandKeyboardInput<(e: FilletKeyboardEvent) => void> {
    constructor(editor: EditorLike) {
        super('curve', editor, [
            'gizmo:fillet:add',
        ]);
    }

    resolve(cb: (e: FilletKeyboardEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:fillet:add':
                cb({ tag: 'add' });
                break;
        }
    }
}