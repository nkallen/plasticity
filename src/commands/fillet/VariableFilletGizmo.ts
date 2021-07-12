import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type VariableFilletGizmoEvent = { tag: 'add' } | { tag: 'undo' }

export class VariableFilletGizmo extends CommandKeyboardInput<(e: VariableFilletGizmoEvent) => void> {
    constructor(editor: EditorLike) {
        super('curve', editor, [
            'gizmo:fillet:add',
        ]);
    }

    resolve(cb: (e: VariableFilletGizmoEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:fillet:add':
                cb({ tag: 'add' });
                break;
        }
    }
}