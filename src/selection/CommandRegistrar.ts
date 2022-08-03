import { CompositeDisposable } from 'event-kit';
import { EditorLike } from '../command/Command';
import CommandRegistry from '../components/atom/CommandRegistry';
import { ConvertCommand } from './SelectionConversionStrategy';
import { SelectionMode, SelectionModeAll } from './SelectionModeSet';

export class SelectionCommandRegistrar {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    constructor(
        private readonly editor: EditorLike
    ) { }

    register(registry: CommandRegistry) {
        const { selection } = this.editor;

        return registry.add(document.body, {
            'selection:mode:set:control-point': () => selection.mode.set(SelectionMode.ControlPoint),
            'selection:mode:set:edge': () => selection.mode.set(SelectionMode.CurveEdge, SelectionMode.Curve),
            'selection:mode:set:face': () => selection.mode.set(SelectionMode.Face, SelectionMode.Region),
            'selection:mode:set:solid': () => selection.mode.set(SelectionMode.Solid, SelectionMode.Empty),
            'selection:mode:set:all': () => selection.mode.set(...SelectionModeAll),

            'selection:mode:toggle:control-point': () => selection.mode.toggle(SelectionMode.ControlPoint),
            'selection:mode:toggle:edge': () => selection.mode.toggle(SelectionMode.CurveEdge, SelectionMode.Curve),
            'selection:mode:toggle:face': () => selection.mode.toggle(SelectionMode.Face, SelectionMode.Region),
            'selection:mode:toggle:solid': () => selection.mode.toggle(SelectionMode.Solid),

            'selection:convert:edge': () => this.editor.enqueue(new ConvertCommand(this.editor, SelectionMode.CurveEdge)),
            'selection:convert:face': () => this.editor.enqueue(new ConvertCommand(this.editor, SelectionMode.Face)),
            'selection:convert:solid': () => this.editor.enqueue(new ConvertCommand(this.editor, SelectionMode.Solid)),

            'snaps:temporarily-enable': () => this.editor.snaps.xor = false,
            'snaps:temporarily-disable': () => this.editor.snaps.xor = true,
        })
    }
}

