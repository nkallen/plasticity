import { Editor } from "./Editor";
import * as cmd from './commands/Command';

export default (editor: Editor) => {
    editor.registry.add('ispace-viewport', {
        'command:move': () => editor.execute(new cmd.MoveCommand(editor)),
    })
}
