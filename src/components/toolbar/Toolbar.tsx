import box from 'bootstrap-icons/icons/box.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import { Disposable } from 'event-kit';
import { render } from 'preact';
import c3d from '../../../build/Release/c3d.node';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import { UndoableSelectionManager } from '../../selection/SelectionManager';
import { GConstructor } from '../../util/Util';
import * as visual from "../../VisualModel";
import { humanizeKeystrokes } from '../atom/tooltip-manager';
import circle from './img/circle.svg';
import curve from './img/curve.svg';
import cut from './img/cut.svg';
import cylinder from './img/cylinder.svg';
import difference from './img/difference.svg';
import fillet from './img/fillet.svg';
import intersection from './img/intersection.svg';
import line from './img/line.svg';
import move from './img/move.svg';
import offsetFace from './img/offset-face.svg';
import rect from './img/rect.svg';
import rotate from './img/rotate.svg';
import scale from './img/scale.svg';
import sphere from './img/sphere.svg';
import union from './img/union.svg';
import loft from './img/loft.svg';
import extrude from './img/loft.svg';
import mirror from './img/loft.svg';

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
icons.set(cmd.ActionFaceCommand, move);
icons.set(cmd.FilletFaceCommand, fillet);
icons.set(cmd.PurifyFaceCommand, trash);
icons.set(cmd.CurveCommand, curve);
icons.set(cmd.SphereCommand, sphere);
icons.set(cmd.CircleCommand, circle);
icons.set(cmd.LineCommand, line);
icons.set(cmd.RectCommand, rect);
icons.set(cmd.CylinderCommand, cylinder);
icons.set(cmd.BoxCommand, box);
icons.set(cmd.LoftCommand, loft);
icons.set(cmd.ExtrudeCommand, extrude);
icons.set(cmd.MirrorCommand, mirror);
// icons.set(cmd.MergerFaceCommand, offsetFace);

const tooltips = new Map<typeof Command, string>();
tooltips.set(cmd.MoveCommand, "Move");
tooltips.set(cmd.RotateCommand, "Rotate");
tooltips.set(cmd.ScaleCommand, "Scale");
tooltips.set(cmd.FilletCommand, "Fillet");
tooltips.set(cmd.IntersectionCommand, "Boolean intersection");
tooltips.set(cmd.DifferenceCommand, "Boolean difference");
tooltips.set(cmd.UnionCommand, "Boolean union");
tooltips.set(cmd.CutCommand, "Cut solid with curve");
tooltips.set(cmd.OffsetFaceCommand, "Offset face");
tooltips.set(cmd.RemoveFaceCommand, "Delete face");
tooltips.set(cmd.CreateFaceCommand, "Copy face");
tooltips.set(cmd.ActionFaceCommand, "Move face");
tooltips.set(cmd.FilletFaceCommand, "Modify fillet of face");
tooltips.set(cmd.PurifyFaceCommand, "Remove fillet");
tooltips.set(cmd.CurveCommand, "Curve");
tooltips.set(cmd.SphereCommand, "Sphere");
tooltips.set(cmd.CircleCommand, "Circle");
tooltips.set(cmd.LineCommand, "Line");
tooltips.set(cmd.RectCommand, "Three point rectangle");
tooltips.set(cmd.CylinderCommand, "Cylinder");
tooltips.set(cmd.BoxCommand, "Box");
tooltips.set(cmd.LoftCommand, "Loft");
tooltips.set(cmd.ExtrudeCommand, "Extrude");
tooltips.set(cmd.MirrorCommand, "Mirror");

const keybindings = new Map<string, string>();
keybindings.set("gizmo:move:x", "X axis");
keybindings.set("gizmo:move:y", "Y axis");
keybindings.set("gizmo:move:z", "Z axis");
keybindings.set("gizmo:move:xy", "Z plane");
keybindings.set("gizmo:move:yz", "X plane");
keybindings.set("gizmo:move:xz", "Y plane");
keybindings.set("gizmo:move:screen", "Screen space");
keybindings.set("gizmo:rotate:x", "X axis");
keybindings.set("gizmo:rotate:y", "Y axis");
keybindings.set("gizmo:rotate:z", "Z axis");
keybindings.set("gizmo:rotate:screen", "Screen space");
keybindings.set("command:abort", "Abort");
keybindings.set("command:finish", "Finish");

export class Model {
    constructor(
        private readonly selection: UndoableSelectionManager,
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
            const solid = db.lookup(parent);
            try {
                const purifiableFaces = c3d.ActionDirect.CollectFacesForModification(solid.GetShell(), c3d.ModifyingType.Purify, 1);
                const purifiableNames = new Set(purifiableFaces.map(f => f.GetNameHash()));
                const all = [...selection.selectedFaces].every(f => {
                    const model = db.lookupTopologyItem(f);
                    return purifiableNames.has(model.GetNameHash());
                });
                if (all) {
                    result.push(cmd.PurifyFaceCommand);
                    result.push(cmd.FilletFaceCommand);
                }
            } catch { }
            try {
                const removableFaces = c3d.ActionDirect.CollectFacesForModification(solid.GetShell(), c3d.ModifyingType.Remove, 1);
                const removableNames = new Set(removableFaces.map(f => f.GetNameHash()));
                const all = [...selection.selectedFaces].every(f => {
                    const model = db.lookupTopologyItem(f);
                    return removableNames.has(model.GetNameHash());
                });
                if (all) {
                    result.push(cmd.RemoveFaceCommand);
                    result.push(cmd.ActionFaceCommand);
                    result.push(cmd.CreateFaceCommand);
                }
            } catch { }
        }
        if (selection.selectedSolids.size > 0 && selection.selectedCurves.size > 0) {
            result.push(cmd.CutCommand)
        }

        return result;
    }
}

export default (editor: Editor) => {
    class Tooltip extends HTMLElement {
        dispose?: Disposable

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            this.dispose = editor.tooltips.add(this.parentElement, {
                title: this.innerHTML,
                keyBindingCommand: `${this.getAttribute('command')}`,
            });
        }

        disconnectedCallback() {
            this.dispose!.dispose();
        }
    }
    customElements.define('ispace-tooltip', Tooltip);

    class CommandButton extends HTMLButtonElement {
        constructor() {
            super();
            type CommandName = keyof typeof cmd;
            const name = this.getAttribute('name');
            if (!name) throw "invalid name";
            const CommandName = name + 'Command' as CommandName;
            const klass = cmd[CommandName] as GConstructor<Command>;
            if (klass == null) throw `${name} is invalid`;
            this.addEventListener('click', e => editor.execute(new klass(editor)));
            const command = cmd[CommandName];
            const tooltip = tooltips.get(command);
            if (!tooltip) throw "no matching tooltip for command " + CommandName;

            const result = <>
                <img title={name} src={icons.get(command)}></img>
                <ispace-tooltip command={`command:${command.title}`}>{tooltip}</ispace-tooltip>
            </>
            render(result, this);
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
            // preact's diffing algorithm will mutate ispace-tooltips rather than create new ones, which leads to corruption;
            // So, force things to be cleared first.
            render('', this);
            const result = (
                <>
                    {this.model.commands.map(command => {
                        const tooltip = tooltips.get(command);
                        if (!tooltip) throw "invalid tooltip for " + command;
                        return <button onClick={_ => editor.execute(new command(editor))}>
                            <img title={command.title} src={icons.get(command)}></img>
                            <ispace-tooltip command={`command:${command.title}`}>{tooltip}</ispace-tooltip>
                        </button>
                    })}
                </>
            );
            render(result, this);
        }

        disconnectedCallback() {
            editor.signals.objectSelected.remove(this.update);
            editor.signals.objectDeselected.remove(this.update);
        }
    }
    customElements.define('ispace-toolbar', Toolbar);

    class Keybindings extends HTMLElement {
        constructor() {
            super();
            this.update = this.update.bind(this);
        }

        connectedCallback() {
            editor.signals.keybindingsRegistered.add(this.update);
        }

        update(commands: string[]) {
            const keymaps = editor.keymaps;
            const result = <ul>
                {commands.map(command => {
                    const bindings = keymaps.findKeyBindings({ command: command });
                    const keystroke = humanizeKeystrokes(bindings[0].keystrokes);
                    return <li><span class="keystroke">{keystroke}</span>{keybindings.get(command)}</li>
                })}
            </ul>;
            render(result, this);
        }

        disconnectedCallback() {
            editor.signals.keybindingsRegistered.remove(this.update);
        }
    }
    customElements.define('ispace-keybindings', Keybindings);
}
