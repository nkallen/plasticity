import { render } from 'preact';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GConstructor } from '../../Util';
import move from './img/move.svg';
import rotate from './img/rotate.svg';
import scale from './img/scale.svg';
import modifyFace from './img/modify-face.svg';
import fillet from './img/fillet.svg';
import intersection from './img/intersection.svg';
import difference from './img/difference.svg';
import union from './img/union.svg';
import cut from './img/cut.svg';
import { SelectionManager } from '../../selection/SelectionManager';

const icons = new Map<typeof Command, string>();
icons.set(cmd.MoveCommand, move);
icons.set(cmd.RotateCommand, rotate);
icons.set(cmd.ScaleCommand, scale);
icons.set(cmd.ModifyFaceCommand, modifyFace);
icons.set(cmd.FilletCommand, fillet);
icons.set(cmd.IntersectionCommand, intersection);
icons.set(cmd.DifferenceCommand, difference);
icons.set(cmd.UnionCommand, union);
icons.set(cmd.CutCommand, cut);

export class Model {
    constructor(private readonly selection: SelectionManager) { }

    get commands() {
        const result = [];
        if (this.selection.selectedSolids.size > 0) {
            result.push(cmd.MoveCommand);
            result.push(cmd.RotateCommand);
            result.push(cmd.ScaleCommand);
        }
        if (this.selection.selectedSolids.size > 1) {
            result.push(cmd.UnionCommand);
            result.push(cmd.IntersectionCommand);
            result.push(cmd.DifferenceCommand);
        }
        if (this.selection.selectedEdges.size > 0) {
            result.push(cmd.FilletCommand);
        }
        if (this.selection.selectedFaces.size > 0) {
            result.push(cmd.ModifyFaceCommand);
        }
        if (this.selection.selectedSolids.size > 0 && this.selection.selectedCurves.size > 0) {
            result.push(cmd.CutCommand)
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