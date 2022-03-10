import { CompositeDisposable } from 'event-kit';
import { render } from 'preact';
import * as cmd from "../../command/Command";
import { ExportCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, LockSelectedCommand, UnhideAllCommand } from '../../commands/CommandLike';
import { DeleteCommand } from '../../commands/GeometryCommands';
import { Editor } from '../../editor/Editor';
import { DisablableType } from '../../editor/TypeManager';
import { ChangeSelectionModifier } from '../../selection/ChangeSelectionExecutor';
import { SelectionKeypressStrategy } from '../../selection/SelectionKeypressStrategy';
import * as visual from '../../visual_model/VisualModel';

export default (editor: Editor) => {
    class Outliner extends HTMLElement {
        private readonly keypress = new SelectionKeypressStrategy(editor.keymaps);
        private readonly disposable = new CompositeDisposable();

        connectedCallback() {
            this.render();
            const { disposable } = this;

            editor.signals.sceneGraphChanged.add(this.render);
            editor.signals.selectionChanged.add(this.render);
            editor.signals.objectHidden.add(this.render);
            editor.signals.objectUnhidden.add(this.render);
            editor.signals.objectSelectable.add(this.render);
            editor.signals.objectUnselectable.add(this.render);

            for (const Command of [DeleteCommand, LockSelectedCommand, HideSelectedCommand, HideUnselectedCommand, InvertHiddenCommand, UnhideAllCommand, ExportCommand]) {
                disposable.add(editor.registry.addOne(this, `command:${Command.identifier}`, () => {
                    const command = new Command(editor);
                    command.agent = 'user';
                    editor.enqueue(command)
                }));
            }
        }

        disconnectedCallback() {
            editor.signals.sceneGraphChanged.remove(this.render);
            editor.signals.selectionChanged.remove(this.render);
            editor.signals.objectHidden.remove(this.render);
            editor.signals.objectUnhidden.remove(this.render);
            editor.signals.objectSelectable.remove(this.render);
            editor.signals.objectUnselectable.remove(this.render);
            this.disposable.dispose();
        }

        render = () => {
            const { db, db: { types } } = editor;
            render(
                <div class="py-3 px-4">
                    {this.section("Solid", visual.Solid, db.find(visual.Solid).map(i => i.view))}
                    {this.section("Curve", visual.Curve3D, db.find(visual.SpaceInstance).map(i => i.view))}
                </div>, this)
        }

        private section(name: "Solid" | "Curve", klass: typeof visual.Solid | typeof visual.Curve3D, items: visual.Item[]) {
            const { db, db: { types } } = editor;
            const selection = editor.selection.selected;
            const isEnabled = types.isEnabled(klass);
            return <section class={isEnabled ? '' : 'opacity-10'}>
                <h1 class="flex justify-between items-center py-0.5 px-2 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700" onClick={e => this.setLayer(e, klass, !isEnabled)}>
                    <div>{name}</div>
                    <div class="p-1 rounded group text-neutral-300">
                        <plasticity-icon key={isEnabled} name={isEnabled ? 'eye' : 'eye-off'}></plasticity-icon>
                    </div>
                </h1>
                <ol class="space-y-1" key={name}>
                    {items.map(item => {
                        const visible = db.isVisible(item);
                        const hidden = db.isHidden(item);
                        const selectable = db.isSelectable(item);
                        const isSelected = selection.has(item);
                        return <li key={item.simpleName} class={`flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700 ${isSelected ? 'bg-neutral-600' : ''}`} onClick={e => this.select(e, item)}>
                            <plasticity-icon name={name.toLowerCase()} class="text-accent-500"></plasticity-icon>
                            <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{name} {item.simpleName}</div>
                            <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setHidden(e, item, !hidden)}>
                                <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                            </button>
                            <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setVisibility(e, item, !visible)}>
                                <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                            </button>
                            <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setSelectable(e, item, !selectable)}>
                                <plasticity-icon key={selectable} name={selectable ? 'no-lock' : 'lock'}></plasticity-icon>
                            </button>
                        </li>;
                    })}
                </ol>
            </section>
        }

        select = (e: MouseEvent, item: visual.Item) => {
            const command = new OutlinerChangeSelectionCommand(editor, [item], this.keypress.event2modifier(e));
            editor.enqueue(command, true);
        }

        setVisibility = (e: MouseEvent, item: visual.Item, value: boolean) => {
            const command = new ToggleVisibilityCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
            this.render();
        }

        setHidden = (e: MouseEvent, item: visual.Item, value: boolean) => {
            const command = new ToggleHiddenCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
            this.render();
        }

        setSelectable = (e: MouseEvent, item: visual.Item, value: boolean) => {
            const command = new ToggleSelectableCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
            this.render();
        }

        setLayer = (e: MouseEvent, kind: DisablableType, value: boolean) => {
            if (value) editor.db.types.enable(kind);
            else editor.db.types.disable(kind);
            this.render();
        }
    }

    customElements.define('plasticity-outliner', Outliner);
}

class OutlinerChangeSelectionCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly items: readonly visual.Item[],
        private readonly modifier: ChangeSelectionModifier
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { items } = this;
        this.editor.changeSelection.onOutlinerSelect(items, this.modifier);
    }
}

class ToggleVisibilityCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: visual.Item,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        this.editor.db.makeVisible(this.item, this.value);
        this.editor.selection.selected.remove(this.item);
    }
}

class ToggleHiddenCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: visual.Item,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { db, selection }, item, value } = this;
        db.makeHidden(this.item, this.value);
        selection.selected.remove(item);
    }
}

class ToggleSelectableCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: visual.Item,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { db, selection }, item, value } = this;
        db.makeSelectable(this.item, this.value);
        selection.selected.remove(item);
    }
}