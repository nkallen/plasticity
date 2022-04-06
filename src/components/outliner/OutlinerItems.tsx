import { render } from 'preact';
import * as cmd from "../../command/Command";
import { Editor } from '../../editor/Editor';
import { Group } from '../../editor/Group';
import { ChangeSelectionModifier } from '../../selection/ChangeSelectionExecutor';
import { SelectionKeypressStrategy } from '../../selection/SelectionKeypressStrategy';
import * as visual from '../../visual_model/VisualModel';

export default (editor: Editor) => {
    const keypress = new SelectionKeypressStrategy(editor.keymaps);

    class OutlinerItem extends HTMLElement {
        private _item!: visual.Item;
        get item() { return this._item }
        set item(item: visual.Item) { this._item = item }

        private _indent!: number;
        get indent() { return this._indent }
        set indent(indent: number) { this._indent = indent }

        connectedCallback() { this.render() }
        disconnectedCallback() { }

        get klass(): string {
            return this.item instanceof visual.Solid ? "Solid" : "Curve";
        }

        render = () => {
            const { scene, selection: { selected } } = editor;
            const { item, klass } = this;

            const visible = scene.isVisible(item);
            const hidden = scene.isHidden(item);
            const selectable = scene.isSelectable(item);
            const isSelected = selected.has(item);
            const name = scene.getName(item) ?? `${klass} ${item.simpleName}`;
            const result = <div class={`flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700 ${isSelected ? 'bg-neutral-600' : ''}`} onClick={e => this.select(e, item)}>
                <plasticity-icon name={klass.toLowerCase()} class="text-accent-500"></plasticity-icon>
                <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{name}</div>
                <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setHidden(e, item, !hidden)}>
                    <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                </button>
                <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setVisibility(e, item, !visible)}>
                    <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                </button>
                <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setSelectable(e, item, !selectable)}>
                    <plasticity-icon key={selectable} name={selectable ? 'no-lock' : 'lock'}></plasticity-icon>
                </button>
            </div>;
            render(result, this);
        }

        select = (e: MouseEvent, item: visual.Item) => {
            const command = new OutlinerChangeSelectionCommand(editor, [item], keypress.event2modifier(e));
            editor.enqueue(command, true);
        }

        setVisibility = (e: MouseEvent, item: visual.Item, value: boolean) => {
            const command = new ToggleVisibilityCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        setHidden = (e: MouseEvent, item: visual.Item, value: boolean) => {
            const command = new ToggleHiddenCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        setSelectable = (e: MouseEvent, item: visual.Item, value: boolean) => {
            const command = new ToggleSelectableCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }
    }
    customElements.define('plasticity-outliner-item', OutlinerItem);

    class OutlinerGroup extends HTMLElement {
        private _group!: Group;
        get group() { return this._group }
        set group(group: Group) { this._group = group }

        connectedCallback() { this.render() }
        disconnectedCallback() { }
        render = () => {
            const { scene } = editor;
            const { group } = this;
            const name = group.isRoot ? "Scene" : scene.getName(group) ?? `Group ${group.id}`;
            const result = <h2
                class="flex justify-between items-center py-0.5 px-2 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700"
            >
                {name}
            </h2>;
            render(result, this);
        }
    }
    customElements.define('plasticity-outliner-group', OutlinerGroup);
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
        this.editor.scene.makeVisible(this.item, this.value);
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
        const { editor: { scene, selection }, item, value } = this;
        scene.makeHidden(this.item, this.value);
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
        const { editor: { scene, selection }, item, value } = this;
        scene.makeSelectable(this.item, this.value);
        selection.selected.remove(item);
    }
}
