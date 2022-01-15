import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import _ from "underscore-plus";
import c3d from '../../../build/Release/c3d.node';
import * as cmd from "../../command/Command";
import { EditorLike } from '../../command/Command';
import { RebuildCommand } from '../../commands/CommandLike';
import { Editor } from '../../editor/Editor';
import { ChangeSelectionModifier } from '../../selection/ChangeSelectionExecutor';
import { AbstractViewportSelector } from '../../selection/ViewportSelector';
import * as visual from '../../visual_model/VisualModel';
import { icons } from '../toolbar/icons';
import { pointerEvent2keyboardEvent } from '../viewport/KeyboardEventManager';

export class Model {
    private readonly mouseButtons: Record<string, ChangeSelectionModifier>;

    constructor(
        private readonly editor: EditorLike,
    ) {
        this.mouseButtons = AbstractViewportSelector.getMouseButtons(editor.keymaps).keystroke2modifier;
    }

    get creators() {
        const { editor: { db }, solid } = this;
        if (solid === undefined) return [];

        const result: c3d.Creator[] = [];
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.GetCreator(i)!;
            result.push(creator.Cast<c3d.Creator>(creator.IsA()));
        }

        return result;
    }

    hoverCreator(creator: c3d.Creator, e: MouseEvent) {
        const { solid, editor: { db, selection: { hovered } } } = this;
        if (solid === undefined) throw new Error("invalid precondition");

        const model = db.lookup(solid);
        const name = creator.GetYourNameMaker();
        const result: visual.TopologyItem[] = [];

        for (const topo of model.GetItems()) {
            if (name.IsChild(topo)) {
                if (topo.IsA() === c3d.TopologyType.Face) {
                    const index = model.GetFaceIndex(topo.Cast<c3d.Face>(c3d.TopologyType.Face));
                    const { views } = db.lookupTopologyItemById(visual.Face.simpleName(solid.simpleName, index))
                    const view = views.values().next().value as visual.Face;
                    hovered.addFace(view);
                    result.push(view);
                } else if (topo.IsA() === c3d.TopologyType.CurveEdge) {
                    const index = model.GetEdgeIndex(topo.Cast<c3d.CurveEdge>(c3d.TopologyType.CurveEdge));
                    const id = visual.CurveEdge.simpleName(solid.simpleName, index);
                    if (db.hasTopologyItem(id)) {
                        const { views } = db.lookupTopologyItemById(id)
                        const view = views.values().next().value as visual.CurveEdge;
                        hovered.addEdge(view);
                        result.push(view);
                    }
                }
            }
        }
        this.editor.changeSelection.onBoxHover(new Set(result), this.event2modifier(e));
        return result;
    }

    async startRebuild(index: number) {
        const command = new RebuildCommand(this.editor);
        command.index = index;
        this.editor.enqueue(command);
    }

    selectCreator(creator: c3d.Creator, e: MouseEvent) {
        const selected = this.hoverCreator(creator, e);
        const editor = this.editor;
        editor.enqueue(new CreatorChangeSelectionCommand(editor, selected, this.event2modifier(e)));
    }

    get solid(): visual.Solid | undefined {
        const selected = this.editor.selection.selected;
        if (selected.solids.size > 0) return selected.solids.first;
        if (selected.faces.size > 0) return selected.faces.first.parentItem;
        if (selected.edges.size > 0) return selected.edges.first.parentItem;
    }

    protected event2modifier(event: MouseEvent): ChangeSelectionModifier {
        const keyboard = pointerEvent2keyboardEvent(event);
        const keystroke = this.editor.keymaps.keystrokeForKeyboardEvent(keyboard);
        return this.mouseButtons[keystroke];
    }
}

export default (editor: Editor) => {
    class Creators extends HTMLElement {
        private readonly dispose = new CompositeDisposable();
        private readonly model = new Model(editor);

        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            editor.signals.selectionChanged.add(this.render);
            this.dispose.add(new Disposable(() => editor.signals.selectionChanged.remove(this.render)));
            this.render();
        }

        disconnectedCallback() {
            this.dispose.dispose();
        }

        render() {
            const { model, model: { creators, solid } } = this;
            if (solid === undefined) {
                render(<></>, this);
                return;
            }

            const result = <ol class="h-[42px] absolute bottom-0 w-full ml-1 px-1 py-0.5 flex flex-row justify-start space-x-0.5 items-center">
                {creators.map((creator, index) => {
                    const Z = `plasticity-creator-${_.dasherize(c3d.CreatorType[creator.IsA()])}`;
                    // @ts-expect-error("not sure how to type this")
                    return <li><Z creator={creator} index={index} item={solid} model={model}></Z></li>
                })}
            </ol>;
            render(result, this);
        }
    }
    customElements.define('plasticity-creators', Creators);

    class Creator extends HTMLElement {
        private _index!: number;
        set index(index: number) { this._index = index }
        get index() { return this._index }

        private _creator!: c3d.Creator;
        get creator() { return this._creator }
        set creator(p: c3d.Creator) { this._creator = p }

        private _item!: visual.Item;
        get item() { return this._item }
        set item(item: visual.Item) { this._item = item }

        private _model!: Model;
        get model() { return this._model }
        set model(model: Model) { this._model = model }

        constructor() {
            super();
            this.render = this.render.bind(this);
            this.pointerEnter = this.pointerEnter.bind(this);
            this.pointerLeave = this.pointerLeave.bind(this);
            this.pointerDown = this.pointerDown.bind(this);
        }

        connectedCallback() { this.render() }

        render() {
            render(
                <button class="p-2 shadow-lg first:rounded-l last:rounded-r bg-neutral-800 group hover:bg-neutral-700" onPointerEnter={this.pointerEnter} onPointerLeave={this.pointerLeave} onPointerDown={this.pointerDown} tabIndex={-1}>
                    <plasticity-icon name={_.dasherize(c3d.CreatorType[this.creator.IsA()])}></plasticity-icon>
                    <plasticity-tooltip placement="top">{c3d.CreatorType[this.creator.IsA()]}</plasticity-tooltip>
                </button>
                , this);
        }

        pointerEnter(e: PointerEvent) {
            if (!e.altKey) {
                this.model.hoverCreator(this.creator, e);
            }
        }

        pointerLeave(e: PointerEvent) {
            editor.selection.hovered.removeAll();
        }

        pointerDown(e: PointerEvent) {
            if (e.altKey) {
                this.model.startRebuild(this.index);
            } else {
                this.model.selectCreator(this.creator, e)
            }
        }
    }
    customElements.define('plasticity-creator', Creator);

    for (const key in c3d.CreatorType) {
        class Anon extends Creator { };
        customElements.define(`plasticity-creator-${_.dasherize(key)}`, Anon);
    }
}

export class CreatorChangeSelectionCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly topologyItems: visual.TopologyItem[],
        private readonly modifier: ChangeSelectionModifier
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { topologyItems } = this;
        this.editor.changeSelection.onCreatorSelect(topologyItems, this.modifier);
    }
}