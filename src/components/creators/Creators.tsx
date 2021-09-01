import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import _ from "underscore-plus";
import c3d from '../../../build/Release/c3d.node';
import { RebuildCommand } from '../../commands/CommandLike';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from '../../editor/GeometryDatabase';
import ModifierManager from '../../editor/ModifierManager';
import * as visual from '../../editor/VisualModel';
import { HasSelection } from '../../selection/SelectionManager';
import { icons } from '../toolbar/icons';

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: DatabaseLike,
        private readonly modifiers: ModifierManager,
    ) { }

    get item() {
        return this.selection.solids.first;
    }

    get creators() {
        const { db, solid } = this;
        if (solid === undefined) return [];

        const result: c3d.Creator[] = [];
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.GetCreator(i)!;
            result.push(creator.Cast<c3d.Creator>(creator.IsA()));
        }

        return result;
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
            const { creators, item } = this.model;
            if (item === undefined) {
                render(<></>, this);
                return;
            }

            const result = <>
                <ol>
                    {creators.map((creator, index) => {
                        const Z = `ispace-creator-${_.dasherize(c3d.CreatorType[creator.IsA()])}`;
                        // @ts-expect-error("not sure how to type this")
                        return <li><Z creator={creator} index={index} item={item}></Z></li>
                    })}
                </ol>
            </>;
            render(result, this);
        }

        disconnectedCallback() {
            this.dispose.dispose();
        }
    }
    customElements.define('ispace-creators', Creators);

    class Creator<C extends c3d.Creator> extends HTMLElement {
        constructor() {
            super();
            this.render = this.render.bind(this);
            this.mouseEnter = this.mouseEnter.bind(this);
            this.mouseLeave = this.mouseLeave.bind(this);
            this.mouseClick = this.mouseClick.bind(this);
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
                <button onPointerEnter={this.mouseEnter} onPointerLeave={this.mouseLeave} onClick={this.mouseClick}>
                    <img src={icons.get(this.creator.constructor)}></img>
                    <ispace-tooltip placement="top">{c3d.CreatorType[this.creator.IsA()]}</ispace-tooltip>
                </button>
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

        mouseClick(e: PointerEvent) {
            const command = new RebuildCommand(editor, this.item as visual.Solid, this.index);
            editor.enqueue(command);
            console.log(e);
        }
    }
    customElements.define('ispace-creator', Creator);

    for (const key in c3d.CreatorType) {
        class Foo extends Creator<any> { };
        customElements.define(`ispace-creator-${_.dasherize(key)}`, Foo);
    }
}
