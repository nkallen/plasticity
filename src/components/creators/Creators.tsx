import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import _ from "underscore-plus";
import c3d from '../../../build/Release/c3d.node';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from '../../editor/GeometryDatabase';
import ModifierManager from '../../editor/ModifierManager';
import * as visual from '../../editor/VisualModel';
import { HasSelection } from '../../selection/SelectionManager';

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: DatabaseLike,
        private readonly modifiers: ModifierManager,
    ) { }

    get item() {
        const { selection } = this;
        if (selection.solids.size == 0) throw new Error("invalid precondition");

        const solid = selection.solids.first;
        return solid;
    }

    get creators() {
        const { db, solid } = this;
        if (solid === undefined) return [];

        const result: [number, c3d.Creator][] = [];
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.GetCreator(i)!;
            result.push([i, creator.Cast<c3d.Creator>(creator.IsA())]);
        }

        return result;
    }

    add() {
        const { db, solid } = this;
        if (solid === undefined) return;

        this.modifiers.add(solid);
    }

    private get solid(): visual.Solid | undefined {
        const { db, selection } = this;
        if (selection.solids.size == 0) return undefined;

        const solid = selection.solids.first!
        return solid;
    }
}

export default (editor: Editor) => {
    class Creators extends HTMLElement {
        private readonly dispose = new CompositeDisposable();
        private readonly model = new Model(editor.selection.selected, editor.db, editor.modifiers);

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
            const result = <>
                <ol>
                    {this.model.creators.map(([i, c]) => {
                        const Z = `ispace-creator-${_.dasherize(c3d.CreatorType[c.IsA()])}`;
                        // @ts-expect-error("not sure how to type this")
                        return <li><Z creator={c} index={i} item={this.model.item}></Z></li>
                    })}
                </ol>
                <button type="button" onClick={e => this.model.add()}>button</button>
            </>;
            render(result, this);
        }

        disconnectedCallback() {
            this.dispose.dispose();
        }
    }
    customElements.define('ispace-creators', Creators);

    class Creator<C extends c3d.Creator, T> extends HTMLElement {
        constructor() {
            super();
            this.render = this.render.bind(this);
            this.mouseEnter = this.mouseEnter.bind(this);
            this.mouseLeave = this.mouseLeave.bind(this);
        }

        private _index!: number;
        set index(index: number) { this._index = index }
        get index() { return this._index }

        private _creator!: c3d.Creator;
        get creator() { return this._creator }
        set creator(p: c3d.Creator) { this._creator = p }

        private _item!: visual.Item;
        get item() { return this._item }
        set item(item: visual.Item) { this._item = item }

        connectedCallback() { this.render() }

        render() {
            render(
                <>
                    <div class="header" onPointerEnter={this.mouseEnter} onPointerLeave={this.mouseLeave}>
                        <input type="checkbox" />
                        <div class="name">{c3d.CreatorType[this.creator.IsA()]} ({c3d.ProcessState[this.creator.GetStatus()]})</div>
                        <div># Basis Items: {this.creator.GetBasisItems().length}</div>
                    </div>
                    {this.creator.GetBasisItems().map(item => {
                        return <div>Item: {c3d.SpaceType[item.IsA()]}</div>
                    })}
                </>
                , this);
        }

        mouseEnter(e: PointerEvent) {
            const { item, creator } = this;
            const { db, selection } = editor;

            const solid = item as visual.Solid;
            const model = db.lookup(solid);
            const name = creator.GetYourNameMaker();

            for (const topo of model.GetItems()) {
                if (name.IsChild(topo) && topo.IsA() === c3d.TopologyType.Face) {
                    const index = model.GetFaceIndex(topo.Cast<c3d.Face>(c3d.TopologyType.Face));
                    const { views } = db.lookupTopologyItemById(visual.Face.simpleName(solid.simpleName, index))
                    const view = views.values().next().value as visual.Face;
                    selection.hovered.addFace(view, solid);
                }
            }
        }

        mouseLeave(e: PointerEvent) {
            editor.selection.hovered.removeAll();
        }
    }
    customElements.define('ispace-creator', Creator);

    for (const key in c3d.CreatorType) {
        class Foo extends Creator<any, any> { };
        customElements.define(`ispace-creator-${_.dasherize(key)}`, Foo);
    }
}
