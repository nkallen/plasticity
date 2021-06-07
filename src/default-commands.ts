import { Editor } from "./Editor";
import * as cmd from './commands/Command';

export default (editor: Editor): void => {
    editor.registry.add('ispace-viewport', {
        'command:move': () => editor.execute(new cmd.MoveCommand(editor)),
        'command:rotate': () => editor.execute(new cmd.RotateCommand(editor)),
        'command:scale': () => editor.execute(new cmd.ScaleCommand(editor)),
        'command:sphere': () => editor.execute(new cmd.SphereCommand(editor)),
        'command:circle': () => editor.execute(new cmd.CircleCommand(editor)),
        'command:cylinder': () => editor.execute(new cmd.CylinderCommand(editor)),
        'command:line': () => editor.execute(new cmd.LineCommand(editor)),
        'command:curve': () => editor.execute(new cmd.CurveCommand(editor)),
        'command:rect': () => editor.execute(new cmd.RectCommand(editor)),
        'command:box': () => editor.execute(new cmd.BoxCommand(editor)),
        'command:union': () => editor.execute(new cmd.UnionCommand(editor)),
        'command:intersection': () => editor.execute(new cmd.IntersectionCommand(editor)),
        'command:difference': () => editor.execute(new cmd.DifferenceCommand(editor)),
        'command:cut': () => editor.execute(new cmd.CutCommand(editor)),
        'command:fillet': () => editor.execute(new cmd.FilletCommand(editor)),
        'command:modify-face': () => editor.execute(new cmd.OffsetFaceCommand(editor)),
        'command:delete': () => editor.execute(new cmd.DeleteCommand(editor)),
    })
}
