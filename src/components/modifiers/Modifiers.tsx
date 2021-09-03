import eye from 'bootstrap-icons/icons/eye.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import checkSquare from 'bootstrap-icons/icons/check-square.svg';
import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import _ from "underscore-plus";
import { AddModifierCommand, ApplyModifierCommand, RemoveModifierCommand } from '../../commands/CommandLike';
import { FilletCommand, SymmetryCommand, UnionCommand } from '../../commands/GeometryCommands';
import { GeometryFactory } from '../../commands/GeometryFactory';
import { SymmetryFactory } from '../../commands/mirror/MirrorFactory';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from '../../editor/GeometryDatabase';
import ModifierManager, { ModifierStack } from '../../editor/ModifierManager';
import * as visual from '../../editor/VisualModel';
import { HasSelection } from '../../selection/SelectionManager';
import { icons } from '../toolbar/icons';

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

    get stack() {
        const { db, solid } = this;
        if (solid === undefined) return emptyStack;

        return this.modifiers.getByPremodified(solid) ?? emptyStack;
    }

    private get solid(): visual.Solid | undefined {
        const { db, selection } = this;
        return selection.solids.first;
    }
}

export default (editor: Editor) => {
    class Modifiers extends HTMLElement {
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
            const { stack, item } = this.model;
            if (item === undefined) {
                render(<></>, this);
                return;
            }

            const result = <>
                <div class="header">
                    <span>Add modifier:</span>
                    <ol>
                        <li>
                            <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))}>
                                <img src={icons.get(SymmetryCommand)}></img>
                                <ispace-tooltip placement="bottom">Add symmetry modifier</ispace-tooltip>
                            </button>
                        </li>
                        <li>
                            <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))}>
                                <img src={icons.get(UnionCommand)}></img>
                                <ispace-tooltip placement="bottom">NOT IMPLEMENTED YET</ispace-tooltip>
                            </button>
                        </li>
                        <li>
                            <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))}>
                                <img src={icons.get(FilletCommand)}></img>
                                <ispace-tooltip placement="bottom">NOT IMPLEMENTED YET</ispace-tooltip>
                            </button>
                        </li>
                    </ol>
                </div>
                <ol>
                    {stack.modifiers.map((factory, index) => {
                        const Z = `ispace-modifier-${_.dasherize(factory.constructor.name)}`;
                        // @ts-expect-error("not sure how to type this")
                        return <li><Z factory={factory} index={index} stack={stack}></Z></li>
                    })}
                </ol>
            </>;
            render(result, this);
        }

        disconnectedCallback() {
            this.dispose.dispose();
        }
    }
    customElements.define('ispace-modifiers', Modifiers);

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
                    <button onClick={_ => editor.enqueue(apply)} name={apply.identifier} class="visibility">
                        <img src={eye} />
                        <ispace-tooltip placement="top" command={`command:${apply.identifier}`}>Disable modifier</ispace-tooltip>
                    </button>
                    <span class="name">Symmetry</span>
                    <button onClick={_ => editor.enqueue(apply)} name={apply.identifier} class="apply">
                        <img src={checkSquare} />
                        <ispace-tooltip placement="top" command={`command:${apply.identifier}`}>Apply modifier</ispace-tooltip>
                    </button>
                    <button onClick={_ => editor.enqueue(remove)} name={remove.identifier} class="remove">
                        <img src={trash} />
                        <ispace-tooltip placement="top" command={`command:${remove.identifier}`}>Remove modifier</ispace-tooltip>
                    </button>
                </div>
                , this);
        }
    }
    customElements.define('ispace-modifier', Modifier);

    class Foo extends Modifier<SymmetryFactory> { };
    customElements.define(`ispace-modifier-symmetry-factory`, Foo);
}
