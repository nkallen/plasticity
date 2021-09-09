import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import _ from "underscore-plus";
import c3d from '../../../build/Release/c3d.node';
import { EditorLike } from '../../commands/Command';
import { CreatorChangeSelectionCommand, RebuildCommand } from '../../commands/CommandLike';
import { RebuildFactory } from '../../commands/rebuild/RebuildFactory';
import { Editor } from '../../editor/Editor';
import { TemporaryObject } from '../../editor/GeometryDatabase';
import * as visual from '../../editor/VisualModel';
import { icons } from '../toolbar/icons';

type State = { tag: 'none' } | { tag: 'updating', temp?: TemporaryObject, factory: RebuildFactory }
export class Model {
    private state: State = { tag: 'none' };

    constructor(
        private readonly editor: EditorLike,
    ) { }

    get item() {
        return this.editor.selection.selected.solids.first;
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

    hoverCreator(creator: c3d.Creator) {
        const { item, editor: { db, selection: { hovered } } } = this;

        const solid = item as visual.Solid;
        const model = db.lookup(solid);
        const name = creator.GetYourNameMaker();
        const result = [];

        for (const topo of model.GetItems()) {
            if (name.IsChild(topo) && topo.IsA() === c3d.TopologyType.Face) {
                const index = model.GetFaceIndex(topo.Cast<c3d.Face>(c3d.TopologyType.Face));
                const { views } = db.lookupTopologyItemById(visual.Face.simpleName(solid.simpleName, index))
                const view = views.values().next().value as visual.Face;
                hovered.addFace(view, solid);
                result.push(view);
            }
        }
        return result;
    }

    async startRebuild(index: number) {
        const command = new RebuildCommand(this.editor);
        command.index = index;
        this.editor.enqueue(command);
    }

    selectCreator(creator: c3d.Creator) {
        const selected = this.hoverCreator(creator);
        const editor = this.editor;
        editor.enqueue(new CreatorChangeSelectionCommand(editor, selected));
    }

    private get solid(): visual.Solid | undefined {
        const { editor: { db, selection } } = this;
        if (selection.selected.solids.size == 0) return undefined;

        const solid = selection.selected.solids.first!
        return solid;
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

        render() {
            const { model, model: { creators, item } } = this;
            if (item === undefined) {
                render(<></>, this);
                return;
            }

            const result = <ol>
                {creators.map((creator, index) => {
                    const Z = `ispace-creator-${_.dasherize(c3d.CreatorType[creator.IsA()])}`;
                    // @ts-expect-error("not sure how to type this")
                    return <li><Z creator={creator} index={index} item={item} model={model}></Z></li>
                })}
            </ol>;
            render(result, this);
        }

        disconnectedCallback() {
            this.dispose.dispose();
        }
    }
    customElements.define('ispace-creators', Creators);

    class Creator<C extends c3d.Creator> extends HTMLElement {
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
                <button onPointerEnter={this.pointerEnter} onPointerLeave={this.pointerLeave} onPointerDown={this.pointerDown} tabIndex={-1}>
                    <img src={icons.get(this.creator.constructor)}></img>
                    <ispace-tooltip placement="top">{c3d.CreatorType[this.creator.IsA()]}</ispace-tooltip>
                </button>
                , this);
        }

        pointerEnter(e: PointerEvent) {
            if (!e.altKey) {
                this.model.hoverCreator(this.creator);
            }
        }

        pointerLeave(e: PointerEvent) {
            editor.selection.hovered.removeAll();
        }

        pointerDown(e: PointerEvent) {
            if (e.altKey) {
                this.model.startRebuild(this.index);
            } else {
                this.model.selectCreator(this.creator)
            }
        }
    }
    customElements.define('ispace-creator', Creator);

    for (const key in c3d.CreatorType) {
        class Anon extends Creator<any> { };
        customElements.define(`ispace-creator-${_.dasherize(key)}`, Anon);
    }
}
