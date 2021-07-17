import { Editor } from "./editor/Editor";
import * as cmd from './commands/Command';

// FIXME move this as well as the icon stuff and keybinding stuff all into one obvious place
export default (editor: Editor): void => {
    editor.registry.add('ispace-viewport', {
        'command:move': () => editor.enqueue(new cmd.MoveCommand(editor)),
        'command:rotate': () => editor.enqueue(new cmd.RotateCommand(editor)),
        'command:scale': () => editor.enqueue(new cmd.ScaleCommand(editor)),
        'command:sphere': () => editor.enqueue(new cmd.SphereCommand(editor)),
        'command:circle': () => editor.enqueue(new cmd.CircleCommand(editor)),
        'command:cylinder': () => editor.enqueue(new cmd.CylinderCommand(editor)),
        'command:line': () => editor.enqueue(new cmd.LineCommand(editor)),
        'command:curve': () => editor.enqueue(new cmd.CurveCommand(editor)),
        'command:rect': () => editor.enqueue(new cmd.ThreePointRectangleCommand(editor)),
        'command:box': () => editor.enqueue(new cmd.BoxCommand(editor)),
        'command:union': () => editor.enqueue(new cmd.UnionCommand(editor)),
        'command:intersection': () => editor.enqueue(new cmd.IntersectionCommand(editor)),
        'command:difference': () => editor.enqueue(new cmd.DifferenceCommand(editor)),
        'command:cut': () => editor.enqueue(new cmd.CutCommand(editor)),
        'command:fillet': () => editor.enqueue(new cmd.FilletCommand(editor)),
        'command:modify-face': () => editor.enqueue(new cmd.OffsetFaceCommand(editor)),
        'command:delete': () => editor.enqueue(new cmd.DeleteCommand(editor)),
        'command:mode': () => editor.enqueue(new cmd.ModeCommand(editor)),
        'command:extrude': () => editor.enqueue(new cmd.ExtrudeCommand(editor)),
    })
}
