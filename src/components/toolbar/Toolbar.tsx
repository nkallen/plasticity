import { Disposable } from 'event-kit';
import { render } from 'preact';
import c3d from '../../../build/Release/c3d.node';
import * as cmd from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from '../../editor/GeometryDatabase';
import * as visual from "../../editor/VisualModel";
import { HasSelection } from '../../selection/SelectionManager';
import { humanizeKeystrokes } from '../atom/tooltip-manager';
import { icons, keybindings, tooltips } from './icons';

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: DatabaseLike
    ) { }

    get commands() {
        const result = [];
        const { db, selection } = this;
        if (selection.regions.size > 0) {
            result.push(cmd.ExtrudeCommand);
        }
        if (selection.solids.size > 0) {
            result.push(cmd.MoveCommand);
            result.push(cmd.RotateCommand);
            result.push(cmd.ScaleCommand);
            result.push(cmd.SelectFilletsCommand);
            result.push(cmd.ClipCurveCommand);
            result.push(cmd.SymmetryCommand);
        }
        if (selection.solids.size > 1) {
            result.push(cmd.UnionCommand);
            result.push(cmd.IntersectionCommand);
            result.push(cmd.DifferenceCommand);
        }
        if (selection.edges.size > 0) {
            result.push(cmd.FilletCommand);
        }
        if (selection.faces.size > 0) {
            result.push(cmd.OffsetFaceCommand);
            result.push(cmd.DraftSolidCommand);
            result.push(cmd.OffsetLoopCommand);
            result.push(cmd.ExtrudeCommand);
            const face = selection.faces.first;
            const parent = face.parentItem as visual.Solid;
            const solid = db.lookup(parent);
            try {
                const shell = solid.GetShell();
                if (shell === null) throw new Error("invalid precondition");
                const purifiableFaces = c3d.ActionDirect.CollectFacesForModification(shell, c3d.ModifyingType.Purify, 1);
                const purifiableNames = new Set(purifiableFaces.map(f => f.GetNameHash()));
                const all = [...selection.faces].every(f => {
                    const model = db.lookupTopologyItem(f);
                    return purifiableNames.has(model.GetNameHash());
                });
                if (all) {
                    result.push(cmd.PurifyFaceCommand);
                    result.push(cmd.RefilletFaceCommand);
                }
            } catch { }
            result.push(cmd.RemoveFaceCommand);
            result.push(cmd.ActionFaceCommand);
            result.push(cmd.CreateFaceCommand);
        }
        if ((selection.faces.size > 0 || selection.solids.size > 0) && selection.curves.size > 0) {
            result.push(cmd.CutCommand);
        }
        if (selection.curves.size > 0) {
            result.push(cmd.ExtrudeCommand);
            result.push(cmd.MirrorCommand);
            result.push(cmd.FilletCurveCommand);
            result.push(cmd.MultilineCommand);
        }
        if (selection.curves.size > 1) {
            result.push(cmd.LoftCommand);
            result.push(cmd.JoinCurvesCommand);
        }
        if (selection.curves.size === 2) {
            result.push(cmd.BridgeCurvesCommand);
        }
        if (selection.controlPoints.size > 0) {
            result.push(cmd.ChangePointCommand);
            result.push(cmd.RemovePointCommand);
            result.push(cmd.FilletCurveCommand);
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
                placement: this.getAttribute('placement') ?? undefined,
                keyBindingCommand: this.getAttribute('command'),
            });
        }

        disconnectedCallback() {
            this.dispose!.dispose();
        }
    }
    customElements.define('ispace-tooltip', Tooltip);

    class Toolbar extends HTMLElement {
        private readonly model = new Model(editor.selection.selected, editor.db);

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
                        return <button onClick={_ => editor.enqueue(new command(editor))} name={command.identifier} tabIndex={-1}>
                            <img src={icons.get(command)}></img>
                            <ispace-tooltip placement="top" command={`command:${command.identifier}`}>{tooltip}</ispace-tooltip>
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
        private commands = new Set<string>();

        constructor() {
            super();
            this.add = this.add.bind(this);
            this.delete = this.delete.bind(this);
        }

        connectedCallback() {
            editor.signals.keybindingsRegistered.add(this.add);
            editor.signals.keybindingsCleared.add(this.delete);
        }

        render() {
            const { commands } = this;
            const keymaps = editor.keymaps;
            const result = <ul>
                {[...commands].map(command => {
                    const bindings = keymaps.findKeyBindings({ command: command });
                    if (bindings.length == 0) {
                        console.warn("Command missing from keymap (default-keymap.ts):", command);
                        return;
                    }
                    const keystroke = humanizeKeystrokes(bindings[0].keystrokes);
                    const desc = keybindings.get(command);
                    if (desc === undefined) {
                        console.warn("Description missing from (icons.ts)", command);
                    }
                    return <li><label class="keystroke">{keystroke}</label>{desc}</li>
                })}
            </ul>;
            render(result, this);
        }

        add(commands: string[]) {
            for (const command of commands) this.commands.add(command);
            this.render();
        }

        delete(commands: string[]) {
            for (const command of commands) this.commands.delete(command);
            this.render();
        }

        disconnectedCallback() {
            editor.signals.keybindingsRegistered.remove(this.add);
            editor.signals.keybindingsCleared.remove(this.add);
        }
    }
    customElements.define('ispace-keybindings', Keybindings);
}
