import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type CircleGizmoEvent = { tag: 'mode' }

export class CircleGizmo extends CommandKeyboardInput<(e: CircleGizmoEvent) => void> {
    constructor(editor: EditorLike) {
        super('circle', editor, [
            'gizmo:circle:mode',
        ]);
    }

    protected resolve(cb: (e: CircleGizmoEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:circle:mode':
                cb({ tag: 'mode' });
                break;
        }
    }
}