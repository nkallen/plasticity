import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import _ from "underscore-plus";
import c3d from '../../../build/Release/c3d.node';
import { AddModifierCommand, ApplyModifierCommand, RemoveModifierCommand } from '../../commands/CommandLike';
import { FilletCommand } from '../../commands/GeometryCommands';
import { GeometryFactory } from '../../commands/GeometryFactory';
import { SymmetryFactory } from '../../commands/mirror/MirrorFactory';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from '../../editor/GeometryDatabase';
import ModifierManager, { ModifierStack } from '../../editor/ModifierManager';
import * as visual from '../../editor/VisualModel';
import { HasSelection } from '../../selection/SelectionManager';
import { icons, tooltips } from '../toolbar/icons';
import eye from 'bootstrap-icons/icons/eye.svg';
import trash from 'bootstrap-icons/icons/trash.svg';

const emptyStack = {
    modifiers: []
};
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

        const result: [number, c3d.Creator][] = [];
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.GetCreator(i)!;
            result.push([i, creator.Cast<c3d.Creator>(creator.IsA())]);
        }

        return result;
    }

    get stack() {
        const { db, solid } = this;
        if (solid === undefined) return emptyStack;

        return this.modifiers.getByPremodified(solid) ?? emptyStack;
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
            const { creators, stack, item } = this.model;
            if (item === undefined) {
                render(<></>, this);
                return;
            }

            const result = <>
                <h4>Construction History</h4>
                <ol>
                    {creators.map(([index, creator]) => {
                        const Z = `ispace-creator-${_.dasherize(c3d.CreatorType[creator.IsA()])}`;
                        // @ts-expect-error("not sure how to type this")
                        return <li><Z creator={creator} index={index} item={item}></Z></li>
                    })}
                </ol>
                <h4>Modifiers</h4>
                <ol>
                    {stack.modifiers.map((factory, index) => {
                        const Z = `ispace-modifier-${_.dasherize(factory.constructor.name)}`;
                        // @ts-expect-error("not sure how to type this")
                        return <li><Z factory={factory} index={index} stack={stack}></Z></li>
                    })}
                </ol>
                <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))}>Add symmetry</button>
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
                    </div>
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
        class Foo extends Creator<any> { };
        customElements.define(`ispace-creator-${_.dasherize(key)}`, Foo);
    }

    class Modifier<F extends GeometryFactory> extends HTMLElement {
        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        private _factory!: F;
        get factory() { return this._factory }
        set factory(factory: F) { this._factory = factory }

        private _stack!: ModifierStack;
        get stack() { return this._stack }
        set stack(stack: ModifierStack) { this._stack = stack }

        private _index!: number;
        set index(index: number) { this._index = index }
        get index() { return this._index }

        connectedCallback() { this.render() }

        render() {
            const { stack, factory } = this;

            const apply = new ApplyModifierCommand(editor, stack, 0);
            const remove = new RemoveModifierCommand(editor, stack, 0);

            render(
                <div class="header">
                    <div class="name">
                        {factory.constructor.name}
                    </div>
                    <div class="buttons">
                        <button onClick={_ => editor.enqueue(apply)} name={apply.identifier}>
                            <img src={eye} />
                            <ispace-tooltip placement="top" command={`command:${apply.identifier}`}>Apply Modifier</ispace-tooltip>
                        </button>
                        <button onClick={_ => editor.enqueue(remove)} name={remove.identifier}>
                            <img src={trash} />
                            <ispace-tooltip placement="top" command={`command:${remove.identifier}`}>Remove Modifier</ispace-tooltip>
                        </button>
                    </div>
                </div>
                , this);
        }
    }
    customElements.define('ispace-modifier', Modifier);

    class Foo extends Modifier<SymmetryFactory> { };
    customElements.define(`ispace-modifier-symmetry-factory`, Foo);
}
