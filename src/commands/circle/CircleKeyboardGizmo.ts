import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type CircleKeyboardEvent = { tag: 'mode' }

export class CircleKeyboardGizmo extends CommandKeyboardInput<(e: CircleKeyboardEvent) => void> {
    constructor(editor: EditorLike) {
        super('circle', editor, [
            'gizmo:circle:mode',
        ]);
    }

    protected resolve(cb: (e: CircleKeyboardEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:circle:mode':
                cb({ tag: 'mode' });
                break;
        }
    }
}