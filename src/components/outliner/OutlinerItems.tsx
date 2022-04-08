import { createRef, render } from 'preact';
import * as cmd from "../../command/Command";
import { Editor } from '../../editor/Editor';
import { Group } from '../../editor/Group';
import { NodeItem, NodeKey } from '../../editor/Nodes';
import { ChangeSelectionModifier } from '../../selection/ChangeSelectionExecutor';
import { SelectionKeypressStrategy } from '../../selection/SelectionKeypressStrategy';
import * as visual from '../../visual_model/VisualModel';

export const indentSize = 20;

export default (editor: Editor) => {
    const keypress = new SelectionKeypressStrategy(editor.keymaps);

    class OutlinerItem extends HTMLElement {
        get nodeKey() { return this.getAttribute("nodeKey")! }
        get indent() { return Number(this.getAttribute("indent"))! }
        get visible() { return Boolean(this.getAttribute("isvisible"))! }
        get hidden() { return Boolean(this.getAttribute("ishidden"))! }
        get selectable() { return Boolean(this.getAttribute("selectable"))! }
        get isSelected() { return Boolean(this.getAttribute("isselected"))! }
        get name() { return this.getAttribute("name")! }
        get klass() { return this.getAttribute("klass")! }

        static get observedAttributes() { return ['name', 'klass', 'isselected', 'selectable', 'ishidden', 'isvisible', 'indent', 'nodeKey'] }

        attributeChangedCallback(name: string, oldValue: string, newValue: string) {
            if (this.isConnected) this.render();
        }

        connectedCallback() { this.render() }
        disconnectedCallback() { }

        private readonly ref = createRef();

        render = (editable = false) => {
            const { scene } = editor;
            const { nodeKey: key, klass, visible, hidden, selectable, isSelected, name } = this;
            const item = scene.key2item(key);

            const indent = item instanceof Group ? this.indent - 1 : this.indent + 1;
            const input = !editable
                ? <input
                    type="text"
                    class={`w-full text-xs ${isSelected ? 'text-accent-100 hover:text-accent-50' : 'text-neutral-300 group-hover:text-neutral-100'} h-6 p-0.5 bg-transparent rounded pointer-events-none overflow-hidden overflow-ellipsis whitespace-nowrap`}
                    ref={this.ref}
                    autoComplete='no' autocorrect='off' spellCheck={false}
                    placeholder={klass} value={name}
                ></input>
                : <input
                    type="text"
                    class={`select-text w-full text-xs h-6 p-0.5 rounded overflow-hidden overflow-ellipsis whitespace-nowrap`}
                    ref={this.ref}
                    autoComplete='no' autocorrect='off' spellCheck={false}
                    placeholder={klass} value={name}
                    onBlur={e => this.handleBlur(e, item)}
                    onKeyDown={e => this.handleEnter(e, item)}
                ></input>;

            const any = hidden || !visible || !selectable;
            const result =
                <div
                    class={`flex gap-1 pr-3 overflow-hidden items-center rounded-md group ${isSelected ? 'bg-accent-600 hover:bg-accent-500' : 'hover:bg-neutral-600'}`} style={`padding-left: ${indentSize * indent}px`}
                    onClick={e => this.select(e, item)}
                >
                    {item instanceof Group ? <plasticity-icon name="nav-arrow-down" class="text-neutral-500"></plasticity-icon> : <div class="w-4 h-4"></div>}
                    <plasticity-icon name={klass.toLowerCase()} class={isSelected ? 'text-accent-100 hover:text-accent-50' : 'text-accent-500 hover:text-neutral-50'}></plasticity-icon>
                    <div
                        class="py-0.5 flex-1"
                        onDblClick={e => { if (!editable) this.editName(e, item) }}
                    >
                        {input}
                    </div>
                    {!editable && <>
                        <button
                            class={`px-1 rounded group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`} ${hidden ? '' : any ? `group-hover:visible invisible` : `group-hover:block hidden`}`}
                            onClick={e => this.setHidden(e, item, !hidden)}
                        >
                            <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                        </button>
                        <button
                            class={`px-1 rounded group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`} ${!visible ? '' : any ? `group-hover:visible invisible` : `group-hover:block hidden`}`}
                            onClick={e => this.setVisibility(e, item, !visible)}
                        >
                            <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                        </button>
                        <button
                            class={`px-1 rounded group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`} ${!selectable ? '' : any ? `group-hover:visible invisible` : `group-hover:block hidden`}`}
                            onClick={e => this.setSelectable(e, item, !selectable)}
                        >
                            <plasticity-icon key={selectable} name={selectable ? 'no-lock' : 'lock'}></plasticity-icon>
                        </button>
                    </>
                    }
                </div>;
            render(result, this);
        }

        select = (e: MouseEvent, item: NodeItem) => {
            const command = new OutlinerChangeSelectionCommand(editor, [item], keypress.event2modifier(e));
            editor.enqueue(command, true);
        }

        setVisibility = (e: MouseEvent, item: NodeItem, value: boolean) => {
            const command = new ToggleVisibilityCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        setHidden = (e: MouseEvent, item: NodeItem, value: boolean) => {
            const command = new ToggleHiddenCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        setSelectable = (e: MouseEvent, item: NodeItem, value: boolean) => {
            const command = new ToggleSelectableCommand(editor, item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        editName = (e: MouseEvent, item: NodeItem) => {
            this.render(true);
            const input = this.ref.current as HTMLInputElement;
            input.select();
            input.focus();
        }

        handleEnter = (e: KeyboardEvent, item: NodeItem) => {
            if (e.code === "Enter") {
                this.setName(item);
                this.ref.current.blur();
            }
            e.stopPropagation();
        }

        handleBlur = (e: FocusEvent, item: NodeItem) => {
            this.setName(item);
            e.stopPropagation();
        }

        setName = (item: NodeItem) => {
            const input = this.ref.current as HTMLInputElement;

            if (input.value === this.name) {
                this.render();
                return;
            }

            const command = new SetNameCommand(editor, item, input.value);
            editor.enqueue(command, true);
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
        private readonly items: readonly NodeItem[],
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
        private readonly item: NodeItem,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        this.editor.scene.makeVisible(this.item, this.value);
        if (this.item instanceof visual.Item) this.editor.selection.selected.remove(this.item);
    }
}

class ToggleHiddenCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: NodeItem,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { scene, selection }, item } = this;
        scene.makeHidden(this.item, this.value);
        if (item instanceof visual.Item) selection.selected.remove(item);
    }
}

class ToggleSelectableCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: NodeItem,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { scene, selection }, item } = this;
        scene.makeSelectable(this.item, this.value);
        if (item instanceof visual.Item) selection.selected.remove(item);
    }
}

class SetNameCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: NodeItem,
        private readonly value: string,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { scene }, item, value } = this;
        scene.setName(item, value);
    }
}
