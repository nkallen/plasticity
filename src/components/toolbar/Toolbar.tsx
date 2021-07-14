import { Disposable } from 'event-kit';
import { render } from 'preact';
import c3d from '../../../build/Release/c3d.node';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import { HasSelection } from '../../selection/SelectionManager';
import { GConstructor } from '../../util/Util';
import * as visual from "../../VisualModel";
import { humanizeKeystrokes } from '../atom/tooltip-manager';
import icons from './icons';
import _ from "underscore-plus";

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
tooltips.set(cmd.DraftSolidCommand, "Draft solid");
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
tooltips.set(cmd.JoinCurvesCommand, "Join curves");
tooltips.set(cmd.RegionCommand, "Region");
tooltips.set(cmd.RegionBooleanCommand, "Region Boolean");
tooltips.set(cmd.ExtrudeRegionCommand, "Extrude");

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
keybindings.set("gizmo:curve:line-segment", "Line segment");
keybindings.set("gizmo:curve:arc", "Arc");
keybindings.set("gizmo:curve:polyline", "Polyline");
keybindings.set("gizmo:curve:nurbs", "NURBS");
keybindings.set("gizmo:curve:hermite", "Hermite");
keybindings.set("gizmo:curve:bezier", "Bezier");
keybindings.set("gizmo:curve:cubic-spline", "Cubic spline");
keybindings.set("gizmo:curve:add-curve", "Add new curve");
keybindings.set("gizmo:curve:undo", "Undo");
keybindings.set("gizmo:fillet:add", "Add variable fillet point");
keybindings.set("gizmo:fillet:distance", "Distance");
keybindings.set("gizmo:circle:mode", "Toggle vertical/horizontal");

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: GeometryDatabase
    ) { }

    get commands() {
        const result = [];
        const { db, selection } = this;
        if (selection.selectedRegions.size > 0) {
            result.push(cmd.ExtrudeRegionCommand);
        }
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
            result.push(cmd.DraftSolidCommand);
            const face = selection.selectedFaces.first;
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
            result.push(cmd.CutCommand);
        }
        if (selection.selectedCurves.size > 0) {
            result.push(cmd.ExtrudeCommand);
            result.push(cmd.RegionCommand);
        }
        if (selection.selectedCurves.size > 1) {
            result.push(cmd.LoftCommand);
            result.push(cmd.JoinCurvesCommand);
        }
        if (selection.selectedRegions.size > 1) {
            result.push(cmd.RegionBooleanCommand);
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
            const CommandName = _.undasherize(name) + 'Command' as CommandName;
            const klass = cmd[CommandName] as GConstructor<Command>;
            if (klass == null) throw `${name} is invalid`;
            this.addEventListener('click', e => {
                editor.enqueue(new klass(editor))
            });
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
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            editor.signals.selectionChanged.add(this.render);

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
                        return <button onClick={_ => editor.enqueue(new command(editor))} name={command.identifier}>
                            <img src={icons.get(command)}></img>
                            <ispace-tooltip command={`command:${command.identifier}`}>{tooltip}</ispace-tooltip>
                        </button>
                    })}
                </>
            );
            render(result, this);
        }

        disconnectedCallback() {
            editor.signals.selectionChanged.remove(this.render);
        }
    }
    customElements.define('ispace-toolbar', Toolbar);

    class Keybindings extends HTMLElement {
        private commands: string[] = [];

        constructor() {
            super();
            this.update = this.update.bind(this);
            this.clear = this.clear.bind(this);
        }

        connectedCallback() {
            editor.signals.keybindingsRegistered.add(this.update);
            editor.signals.keybindingsCleared.add(this.clear);
        }

        update(newCommands?: string[]) {
            this.commands = this.commands.concat(newCommands ?? []);
            const keymaps = editor.keymaps;
            const result = <ul>
                {this.commands.map(command => {
                    const bindings = keymaps.findKeyBindings({ command: command });
                    if (bindings.length == 0) {
                        console.warn("Command missing:", command);
                        return;
                    }
                    const keystroke = humanizeKeystrokes(bindings[0].keystrokes);
                    return <li><span class="keystroke">{keystroke}</span>{keybindings.get(command)}</li>
                })}
            </ul>;
            render(result, this);
        }

        clear() {
            this.commands = [];
            this.update();
        }

        disconnectedCallback() {
            editor.signals.keybindingsRegistered.remove(this.update);
        }
    }
    customElements.define('ispace-keybindings', Keybindings);
}
