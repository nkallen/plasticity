import { Editor } from '../Editor_'

type callSuper = never;
export abstract class GeometryFactory {
    editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    update(): callSuper {
        this.editor.signals.commandUpdated.dispatch();
        return undefined as callSuper;
    }
}
