import { render } from 'preact';
import * as cmd from "../../command/Command";
import { Editor } from '../../editor/Editor';
import { DisablableType } from '../../editor/TypeManager';
import { ChangeSelectionModifier } from '../../selection/ChangeSelectionExecutor';
import { SelectionKeypressStrategy } from '../../selection/SelectionKeypressStrategy';
import * as visual from '../../visual_model/VisualModel';

export default (editor: Editor) => {
    class Outliner extends HTMLElement {
        private readonly keypress = new SelectionKeypressStrategy(editor.keymaps);

        connectedCallback() {
            this.render();
            editor.signals.sceneGraphChanged.add(this.render);
            editor.signals.selectionChanged.add(this.render);
        }

        disconnectedCallback() {
            editor.signals.sceneGraphChanged.remove(this.render);
            editor.signals.selectionChanged.add(this.render);
        }

        render = () => {
            const { db, db: { types } } = editor;
            render(
                <div class="py-3 px-4">
                    <section class="mb-4">
                        <h1 class="flex justify-between items-center py-0.5 px-2 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700" onClick={e => this.setLayer(e, visual.Solid, !types.isEnabled(visual.Solid))}>
                            <div>Solids</div>
                            <div class="p-1 rounded group text-neutral-300">
                                <plasticity-icon key={types.isEnabled(visual.Solid)} name={types.isEnabled(visual.Solid) ? 'eye' : 'eye-off'}></plasticity-icon>
                            </div>
                        </h1>
                        {this.section("Solids", db.find(visual.Solid).map(info => info.view))}
                    </section>
                    <section>
                        <h1 class="flex justify-between items-center py-0.5 px-2 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700" onClick={e => this.setLayer(e, visual.Curve3D, !types.isEnabled(visual.Curve3D))}>
                            <div>Curves</div>
                            <div class="p-1 rounded group text-neutral-300">
                                <plasticity-icon key={types.isEnabled(visual.Curve3D)} name={types.isEnabled(visual.Curve3D) ? 'eye' : 'eye-off'}></plasticity-icon>
                            </div>
                        </h1>
                        {this.section("Curves", db.find(visual.SpaceInstance).map(info => info.view))}
                    </section>
                </div>, this)
        }

        private section(name: string, items: visual.Item[]) {
            const db = editor.db;
            const selection = editor.selection.selected;
            return <ol class="space-y-1" key={name}>
                {items.map(item => {
                    const visible = db.isVisible(item);
                    const hidden = db.isHidden(item);
                    const isSelected = selection.has(item);
                    return <li key={item.simpleName} class={`flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700 ${isSelected ? 'bg-neutral-600' : ''}`} onClick={e => this.select(e, item)}>
                        <plasticity-icon name={item instanceof visual.Solid ? 'solid' : 'curve'} class="text-accent-500"></plasticity-icon>
                        <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{item instanceof visual.Solid ? 'Solid' : 'Curve'} {item.simpleName}</div>
                        <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setHidden(e, item, !hidden)}>
                            <plasticity-icon key={hidden} name={hidden ? 'eye' : 'eye-off'}></plasticity-icon>
                        </button>
                        <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500" onClick={e => this.setVisibility(e, item, !visible)}>
                            <plasticity-icon key={visible} name={visible ? 'light-bulb-on' : 'light-bulb-off'}></plasticity-icon>
                        </button>
                    </li>;
                })}
            </ol>;
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
        console.log(value);
        if (!value) db.hide(item)
        else db.unhide(item);
        selection.selected.remove(item);
    }
}