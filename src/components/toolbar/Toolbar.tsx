import { render } from 'preact';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GConstructor } from '../../Util';
import move from './move.svg';
import rotate from './rotate.svg';
import scale from './scale.svg';
import { SelectionManager } from '../../selection/SelectionManager';

const icons = new Map<typeof Command, string>();
icons.set(cmd.MoveCommand, move);
icons.set(cmd.RotateCommand, rotate);
icons.set(cmd.ScaleCommand, scale);

export class Model {
    constructor(private readonly selection: SelectionManager) { }

    get commands() {
        const result = [];
        if (this.selection.selectedSolids.size > 0) {
            result.push(cmd.MoveCommand);
            result.push(cmd.RotateCommand);
            result.push(cmd.ScaleCommand);
        }
        return result;
    }
}

export default (editor: Editor) => {
    class CommandButton extends HTMLButtonElement {
        constructor() {
            super();
            type CommandName = keyof typeof cmd;
            const name = this.getAttribute('name');
            const CommandName = name + 'Command' as CommandName;
            const klass = cmd[CommandName] as GConstructor<Command>;
            if (klass == null) throw `${name} is invalid`;
            this.addEventListener('click', e => editor.execute(new klass(editor)));
        }
    }
    customElements.define('ispace-command', CommandButton, { extends: 'button' });

    class Toolbar extends HTMLElement {
        private readonly model = new Model(editor.selection);

        constructor() {
            super();
            this.update = this.update.bind(this);
        }

        connectedCallback() {
            editor.signals.objectSelected.add(this.update);
            editor.signals.objectDeselected.add(this.update);

            this.render();
        }

        update(object: THREE.Object3D) {
            console.log("in update");
            this.render();
        }

        render() {
            const result = (
                <>
                    { this.model.commands.map(command => (
                        <button onClick={e => editor.execute(new command(editor))}>
                            <img title={command.title} src={icons.get(command)}></img>
                        </button>
                    ))}
                </>
            );
            render(result, this);
        }
    }
    customElements.define('ispace-toolbar2', Toolbar);
}