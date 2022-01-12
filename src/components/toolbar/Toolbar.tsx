import { Disposable } from 'event-kit';
import { render } from 'preact';
import Command from '../../command/Command';
import * as cmd from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from "../../editor/DatabaseLike";
import { HasSelection } from '../../selection/SelectionDatabase';
import { GConstructor } from '../../util/Util';
import { icons, tooltips } from './icons';

interface CommandList {
    sections: (typeof Command & GConstructor<Command>)[][];
    trash?: (typeof Command & GConstructor<Command>);
}

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: DatabaseLike
    ) { }

    get commands(): CommandList {
        const { selection } = this;

        const translations: Set<(typeof Command & GConstructor<Command>)> = new Set();
        const misc: Set<(typeof Command & GConstructor<Command>)> = new Set();
        let trash: (typeof Command & GConstructor<Command>) | undefined = undefined;

        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.faces.size > 0 || selection.controlPoints.size > 0) {
            translations.add(cmd.MoveCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.faces.size > 0 || selection.controlPoints.size > 0) {
            trash = cmd.DeleteCommand;
            translations.add(cmd.RotateCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.controlPoints.size > 0) {
            translations.add(cmd.ScaleCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0 || selection.faces.size > 0) {
            misc.add(cmd.ShellCommand);
        }
        if (selection.curves.size > 0 || selection.solids.size > 0) {
            misc.add(cmd.MirrorCommand);
        }
        if (selection.regions.size > 0) {
            misc.add(cmd.ExtrudeCommand);
        }
        if (selection.solids.size > 0) {
            misc.add(cmd.RadialArrayCommand);
        }
        if (selection.solids.size > 1) {
            misc.add(cmd.UnionCommand);
            misc.add(cmd.IntersectionCommand);
            misc.add(cmd.DifferenceCommand);
        }
        if (selection.faces.size > 0) {
            misc.add(cmd.OffsetCurveCommand);
            misc.add(cmd.ExtrudeCommand);
            misc.add(cmd.ExtensionShellCommand);
        }
        if (selection.faces.size > 0 || selection.solids.size > 0) {
            misc.add(cmd.CutCommand);
        }
        if (selection.curves.size > 0) {
            misc.add(cmd.ExtrudeCommand);
            misc.add(cmd.RevolutionCommand);
            misc.add(cmd.OffsetCurveCommand);
        }
        if (selection.curves.size > 1) {
            misc.add(cmd.LoftCommand);
            misc.add(cmd.JoinCurvesCommand);
        }
        if (selection.edges.size > 0) {
            misc.add(cmd.FilletSolidCommand);
            misc.add(cmd.OffsetCurveCommand);
        }
        if (selection.edges.size > 0 || selection.curves.size > 0 || selection.solids.size > 0) {
            misc.add(cmd.DuplicateCommand);
        }
        if (selection.faces.size > 0) {
            misc.add(cmd.OffsetFaceCommand);
        }
        return { sections: [[...translations], [...misc]], trash };
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

        disconnectedCallback() {
            editor.signals.selectionChanged.remove(this.render);
        }

        render() {
            const { model: { commands: { sections, trash } } } = this;


            // preact's diffing algorithm will mutate ispace-tooltips rather than create new ones, which leads to corruption;
            // So, force things to be cleared first.
            render('', this);
            const result = (
                <div class="absolute flex flex-row space-x-2 -translate-x-1/2 bottom-2 left-1/2">
                    {
                        sections.map(section => {
                            <div class="flex flex-row space-x-0.5">
                                {
                                    section.map(command => {
                                        const tooltip = tooltips.get(command);
                                        if (!tooltip) console.error("invalid tooltip for " + command);
                                        const constructor = command as GConstructor<Command>;
                                        <button class="p-2 shadow-lg bg-accent-800 hover:bg-accent-600 first:rounded-l last:rounded-r cursor-pointer"
                                            onClick={_ => editor.enqueue(new constructor(editor))} name={command.identifier}
                                        >
                                            <svg width="24" height="24" class="w-4 h-4 stroke-2 text-neutral-200 group-hover:text-neutral-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        </button>
                                        //     <ispace-tooltip placement="top" command={`command:${command.identifier}`}>{tooltip}</ispace-tooltip>
                                        // return <button onClick={_ => editor.enqueue(new constructor(editor))} name={command.identifier} tabIndex={-1}>
                                        //     <img src={icons.get(command)}></img>
                                        // </button>
                                    })
                                }
                            </div>
                        })
                    }
                </div>
            );
            render(result, this);
        }

    }
    customElements.define('plasticity-toolbar', Toolbar);
}
