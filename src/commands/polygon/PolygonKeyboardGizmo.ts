import { CommandKeyboardInput, EditorLike } from "../CommandKeyboardInput";

export type PolygonKeyboardEvent = { tag: 'add-vertex' } | { tag: 'subtract-vertex' }

export class PolygonKeyboardGizmo extends CommandKeyboardInput<(e: PolygonKeyboardEvent) => void> {
    constructor(editor: EditorLike) {
        super('polygon', editor, [
            'gizmo:polygon:add-vertex',
            'gizmo:polygon:subtract-vertex',
        ]);
    }

    protected resolve(cb: (e: PolygonKeyboardEvent) => void, command: string) {
        switch (command) {
            case 'gizmo:polygon:add-vertex':
                cb({ tag: 'add-vertex' });
                break;
            case 'gizmo:polygon:subtract-vertex':
                cb({ tag: 'subtract-vertex' });
                break;
        }
    }
}