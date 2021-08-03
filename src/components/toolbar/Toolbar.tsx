import { Disposable } from 'event-kit';
import { render } from 'preact';
import c3d from '../../../build/Release/c3d.node';
import * as cmd from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { GeometryDatabase } from '../../editor/GeometryDatabase';
import * as visual from "../../editor/VisualModel";
import { HasSelection } from '../../selection/SelectionManager';
import { humanizeKeystrokes } from '../atom/tooltip-manager';
import { icons, keybindings, tooltips } from './icons';

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
            result.push(cmd.SelectFilletsCommand);
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
                const shell = solid.GetShell();
                if (shell === null) throw new Error("invalid precondition");
                const purifiableFaces = c3d.ActionDirect.CollectFacesForModification(shell, c3d.ModifyingType.Purify, 1);
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
            result.push(cmd.RemoveFaceCommand);
            result.push(cmd.ActionFaceCommand);
            result.push(cmd.CreateFaceCommand);
        }
        if (selection.selectedSolids.size > 0 && selection.selectedCurves.size > 0) {
            result.push(cmd.CutCommand);
        }
        if (selection.selectedCurves.size > 0) {
            result.push(cmd.ExtrudeCommand);
            result.push(cmd.MirrorCommand);
        }
        if (selection.selectedCurves.size > 1) {
            result.push(cmd.LoftCommand);
            result.push(cmd.JoinCurvesCommand);
        }
        if (selection.selectedControlPoints.size > 0) {
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
