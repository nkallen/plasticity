import { createRef, render } from 'preact';
import * as cmd from "../../command/Command";
import { Editor } from '../../editor/Editor';
import { Empty } from '../../editor/Empties';
import { Group } from '../../editor/Groups';
import { NodeItem, RealNodeItem } from '../../editor/Nodes';
import { ChangeSelectionModifier, ChangeSelectionOption } from '../../selection/ChangeSelectionExecutor';
import * as visual from '../../visual_model/VisualModel';

export const indentSize = 20;

export default (editor: Editor) => {
    class OutlinerItem extends HTMLElement {
        get nodeKey() { return this.getAttribute("nodeKey")! }
        get indent() { return Number(this.getAttribute("indent"))! }
        get visible() { return Boolean(this.getAttribute("isvisible"))! }
        get hidden() { return Boolean(this.getAttribute("ishidden"))! }
        get selectable() { return Boolean(this.getAttribute("selectable"))! }
        get isSelected() { return Boolean(this.getAttribute("isselected"))! }
        get isDisplayed() { return Boolean(this.getAttribute("isdisplayed"))! }
        get name() { return this.getAttribute("name")! }
        get klass() { return this.getAttribute("klass")! }
        get color() { return this.getAttribute("color") ?? undefined }

        static get observedAttributes() { return ['name', 'klass', 'isselected', 'selectable', 'ishidden', 'isvisible', 'isdisplayed', 'indent', 'nodeKey', 'color'] }

        attributeChangedCallback(name: string, oldValue: string, newValue: string) {
            if (this.isConnected) this.render();
        }

        connectedCallback() { this.render() }
        disconnectedCallback() { }

        private readonly ref = createRef();

        render = (editable = false) => {
            const { klass, visible, hidden, selectable, isSelected, isDisplayed, name, color } = this;
            const item = this.item;

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
                    onBlur={e => this.handleBlur(e)}
                    onKeyDown={e => this.handleEnter(e)}
                    onSelect={e => e.stopPropagation()}
                ></input>;
            const anySettingsForThisSpecificItem = hidden || !visible || !selectable;
            const result =
                <div
                    class={`flex gap-1 pr-3 overflow-hidden items-center group ${isDisplayed ? '' : 'opacity-50'}  ${isSelected ? 'bg-accent-600 hover:bg-accent-500' : 'hover:bg-neutral-600 hover:rounded'}`} style={`padding-left: ${4 + indentSize * indent}px`}
                    onClick={e => { if (isDisplayed) this.select(e); }}
                    onPointerMove={e => { if (isDisplayed) this.hover(e) }}
                >
                    {item instanceof Group
                        ? <button
                            onClick={e => this.expand(e)}
                        >
                            <plasticity-icon name="nav-arrow-down" class="text-neutral-500 hover:text-neutral-300"></plasticity-icon>
                        </button>
                        : <div class="w-4 h-4"></div>
                    }
                    <plasticity-icon name={klass.toLowerCase()} class={isSelected ? 'text-accent-100 hover:text-accent-50' : 'text-accent-500 hover:text-neutral-50'}></plasticity-icon>
                    <div
                        class="py-0.5 flex-1"
                        onDblClick={e => { if (!editable) this.editName(e) }}
                    >
                        {input}
                    </div>
                    {!editable && <>
                        <button
                            class={`px-1 rounded group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`} ${hidden ? '' : anySettingsForThisSpecificItem ? `group-hover:visible invisible` : `group-hover:block hidden`}`}
                            onClick={e => this.setHidden(e, !hidden)}
                        >
                            <plasticity-tooltip placement="top" command="command:hide-selected">Hide in viewport</plasticity-tooltip>
                            <plasticity-icon key={!hidden} name={!hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                        </button>
                        <button
                            class={`px-1 rounded group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`} ${!visible ? '' : anySettingsForThisSpecificItem ? `group-hover:visible invisible` : `group-hover:block hidden`}`}
                            onClick={e => this.setVisibility(e, !visible)}
                        >
                            <plasticity-tooltip placement="top">Disable in viewport</plasticity-tooltip>
                            <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                        </button>
                        <button
                            class={`px-1 rounded group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`} ${!selectable ? '' : anySettingsForThisSpecificItem ? `group-hover:visible invisible` : `group-hover:block hidden`}`}
                            onClick={e => this.setSelectable(e, !selectable)}
                        >
                            <plasticity-tooltip placement="top">Disable selection in viewport</plasticity-tooltip>
                            <plasticity-icon key={selectable} name={selectable ? 'no-lock' : 'lock'}></plasticity-icon>
                        </button>
                        <button
                            style={color === undefined ? "" : `background-color: #${color}`}
                            class={`w-2 h-2 px-1 rounded-full group ${isSelected ? 'text-accent-300 hover:text-accent-100' : `text-neutral-300 hover:text-neutral-100`}`}
                        >
                        </button>
                    </>
                    }
                </div>;
            render(result, this);
        }

        expand = (e: MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            this.dispatchEvent(new CustomEvent('expand', { bubbles: true }));
        }

        select = (e: MouseEvent) => {
            this.dispatchEvent(new CustomEvent('select', { bubbles: true, detail: e }));
        }

        hover = (e: MouseEvent) => {
            this.dispatchEvent(new CustomEvent('hover', { bubbles: true, detail: e }));
        }

        setVisibility = (e: MouseEvent, value: boolean) => {
            const command = new ToggleVisibilityCommand(editor, this.item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        setHidden = (e: MouseEvent, value: boolean) => {
            const command = new ToggleHiddenCommand(editor, this.item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        setSelectable = (e: MouseEvent, value: boolean) => {
            const command = new ToggleSelectableCommand(editor, this.item, value);
            editor.enqueue(command, true);
            e.stopPropagation();
        }

        editName = (e: MouseEvent) => {
            this.render(true);
            const input = this.ref.current as HTMLInputElement;
            input.select();
            input.focus();
        }

        handleEnter = (e: KeyboardEvent) => {
            if (e.code === "Enter") {
                this.setName(this.item);
                this.ref.current.blur();
            }
            e.stopPropagation();
        }

        handleBlur = (e: FocusEvent) => {
            this.setName(this.item);
            e.stopPropagation();
        }

        private setName = (item: RealNodeItem) => {
            const input = this.ref.current as HTMLInputElement;

            if (input.value === this.name) {
                this.render();
                return;
            }

            const command = new SetNameCommand(editor, item, input.value);
            editor.enqueue(command, true);
        }

        get item(): RealNodeItem {
            const { scene } = editor;
            const { nodeKey: key } = this;
            const item = scene.key2item(key);
            if (!(item instanceof visual.Item || item instanceof Group || item instanceof Empty)) throw new Error("invalid item: " + item.constructor.name);
            return item;
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
        private readonly items: readonly RealNodeItem[],
        private readonly modifier: ChangeSelectionModifier,
        private readonly option: ChangeSelectionOption
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { items } = this;
        this.editor.changeSelection.onOutlinerSelect(items, this.modifier, this.option);
    }
}

export class ToggleVisibilityCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: NodeItem,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        this.editor.scene.makeVisible(this.item, this.value);
    }
}

class ToggleHiddenCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly item: RealNodeItem,
        private readonly value: boolean,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { scene, selection }, item } = this;
        scene.makeHidden(this.item, this.value);
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
        private readonly item: RealNodeItem,
        private readonly value: string,
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { editor: { scene }, item, value } = this;
        scene.setName(item, value);
    }
}
