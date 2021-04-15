import { render } from 'preact';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import { SelectionManager } from '../../selection/SelectionManager';
import { GConstructor } from '../../Util';
import c3d from '../../../build/Release/c3d.node';
import * as visual from "../../VisualModel";
import cut from './img/cut.svg';
import difference from './img/difference.svg';
import fillet from './img/fillet.svg';
import intersection from './img/intersection.svg';
import offsetFace from './img/offset-face.svg';
import move from './img/move.svg';
import rotate from './img/rotate.svg';
import scale from './img/scale.svg';
import union from './img/union.svg';
import trash from 'bootstrap-icons/icons/trash.svg';

const icons = new Map<typeof Command, string>();
icons.set(cmd.MoveCommand, move);
icons.set(cmd.RotateCommand, rotate);
icons.set(cmd.ScaleCommand, scale);
icons.set(cmd.FilletCommand, fillet);
icons.set(cmd.IntersectionCommand, intersection);
icons.set(cmd.DifferenceCommand, difference);
icons.set(cmd.UnionCommand, union);
icons.set(cmd.CutCommand, cut);
icons.set(cmd.OffsetFaceCommand, offsetFace);
icons.set(cmd.RemoveFaceCommand, trash);
icons.set(cmd.CreateFaceCommand, offsetFace);
icons.set(cmd.ActionFaceCommand, offsetFace);
icons.set(cmd.FilletFaceCommand, offsetFace);
icons.set(cmd.PurifyFaceCommand, offsetFace);
icons.set(cmd.MergerFaceCommand, offsetFace);

export class Model {
    constructor(
        private readonly selection: SelectionManager,
        private readonly db: GeometryDatabase) { }

    get commands() {
        const result = [];
        const { db, selection } = this;
        if (selection.selectedSolids.size > 0) {
            result.push(cmd.MoveCommand);
            result.push(cmd.RotateCommand);
            result.push(cmd.ScaleCommand);
        }
        if (selection.selectedSolids.size > 1) {
            result.push(cmd.UnionCommand);
            result.push(cmd.IntersectionCommand);
            result.push(cmd.DifferenceCommand);
        }
        if (selection.selectedEdges.size > 0) {
            result.push(cmd.FilletCommand);
        }
        if (selection.selectedFaces.size > 0) {
            result.push(cmd.OffsetFaceCommand);
            const face = [...selection.selectedFaces][0];
            const parent = face.parentItem as visual.Solid;
            const solid = this.db.lookup(parent);
            const model = this.db.lookupTopologyItem(face);
            try {
                const purifiableFaces = c3d.ActionDirect.CollectFacesForModification(solid.GetShell(), c3d.ModifyingType.Purify, 1);
                console.log("purifiableFaces", purifiableFaces)
                const purifiableNames = new Set(purifiableFaces.map(f => f.GetNameHash()));
                const all = [...selection.selectedFaces].every(f => {
                    const model = this.db.lookupTopologyItem(face);
                    return purifiableNames.has(model.GetNameHash());
                });
                if (all) {
                    result.push(cmd.PurifyFaceCommand);
                    result.push(cmd.FilletFaceCommand);
                }
            } catch {}
            try {
                const removableFaces = c3d.ActionDirect.CollectFacesForModification(solid.GetShell(), c3d.ModifyingType.Remove, 1);
                console.log("removableFaces", removableFaces);
                const removableNames = new Set(removableFaces.map(f => f.GetNameHash()));
                const all = [...selection.selectedFaces].every(f => {
                    const model = this.db.lookupTopologyItem(face);
                    return removableNames.has(model.GetNameHash());
                });
                if (all) {
                    result.push(cmd.RemoveFaceCommand);
                    result.push(cmd.OffsetFaceCommand);
                    result.push(cmd.ActionFaceCommand);
                    result.push(cmd.CreateFaceCommand);
                }
            } catch {}
            // const removableFaces = c3d.ActionDirect.CollectFacesForModification(solid.GetShell(), c3d.ModifyingType.Remove, 1);

        }
        if (selection.selectedSolids.size > 0 && selection.selectedCurves.size > 0) {
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
        private readonly model = new Model(editor.selection, editor.db);

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
                        <button onClick={_ => editor.execute(new command(editor))}>
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