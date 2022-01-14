import checkSquare from 'iconoir/icons/check.svg';
import eye from 'iconoir/icons/eye-alt.svg';
import trash from 'iconoir/icons/trash.svg';
import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import * as THREE from 'three';
import _ from "underscore-plus";
import * as cmd from "../../command/Command";
import { MirrorCommand } from '../../commands/GeometryCommands';
import { UnionCommand } from "../../commands/boolean/BooleanCommand";
import { FilletSolidCommand } from "../../commands/fillet/FilletCommand";
import { GeometryFactory } from '../../command/GeometryFactory';
import { SymmetryFactory } from '../../commands/mirror/MirrorFactory';
import { MirrorGizmo } from '../../commands/mirror/MirrorGizmo';
import { Editor } from '../../editor/Editor';
import { DatabaseLike } from "../../editor/DatabaseLike";
import ModifierManager, { ModifierStack } from '../../editor/ModifierManager';
import { HasSelection } from '../../selection/SelectionDatabase';
import * as visual from '../../visual_model/VisualModel';
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
                            <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))} tabIndex={-1}>
                                <img src={icons.get(MirrorCommand)}></img>
                                <plasticity-tooltip placement="bottom">Add symmetry modifier</plasticity-tooltip>
                            </button>
                        </li>
                        <li>
                            <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))} tabIndex={-1}>
                                <img src={icons.get(UnionCommand)}></img>
                                <plasticity-tooltip placement="bottom">NOT IMPLEMENTED YET</plasticity-tooltip>
                            </button>
                        </li>
                        <li>
                            <button type="button" onClick={_ => editor.enqueue(new AddModifierCommand(editor))} tabIndex={-1}>
                                <img src={icons.get(FilletSolidCommand)}></img>
                                <plasticity-tooltip placement="bottom">NOT IMPLEMENTED YET</plasticity-tooltip>
                            </button>
                        </li>
                    </ol>
                </div>
                <ol>
                    {stack.modifiers.map((factory, index) => {
                        const Z = `plasticity-modifier-${_.dasherize(factory.constructor.name)}`;
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
    customElements.define('plasticity-modifiers', Modifiers);

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
                    <button onClick={_ => editor.enqueue(apply)} name={apply.identifier} class="visibility" tabIndex={-1}>
                        <img src={eye} />
                        <plasticity-tooltip placement="top" command={`command:${apply.identifier}`}>Disable modifier</plasticity-tooltip>
                    </button>
                    <span class="name">Symmetry</span>
                    <button onClick={_ => editor.enqueue(apply)} name={apply.identifier} class="apply" tabIndex={-1}>
                        <img src={checkSquare} />
                        <plasticity-tooltip placement="top" command={`command:${apply.identifier}`}>Apply modifier</plasticity-tooltip>
                    </button>
                    <button onClick={_ => editor.enqueue(remove)} name={remove.identifier} class="remove" tabIndex={-1}>
                        <img src={trash} />
                        <plasticity-tooltip placement="top" command={`command:${remove.identifier}`}>Remove modifier</plasticity-tooltip>
                    </button>
                </div>
                , this);
        }
    }
    customElements.define('plasticity-modifier', Modifier);

    class Foo extends Modifier<SymmetryFactory> { };
    customElements.define(`plasticity-modifier-symmetry-factory`, Foo);
}


export class AddModifierCommand extends cmd.CommandLike {
    async execute(): Promise<void> {
        const { modifiers, selection } = this.editor;
        const solid = selection.selected.solids.first;

        const preview = new SymmetryFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        preview.solid = solid;
        preview.origin = new THREE.Vector3();

        const gizmo = new MirrorGizmo(preview, this.editor);
        await gizmo.execute(s => {
            preview.update();
        }).resource(this);
        preview.cancel();

        const stack_factory = modifiers.add(solid, SymmetryFactory);
        let stack = stack_factory.stack;
        const factory = stack_factory.factory;
        factory.solid = solid;
        factory.origin = preview.origin;
        factory.quaternion = preview.quaternion;
        stack = await modifiers.rebuild(stack);

        selection.selected.addSolid(stack.modified);
    }
}

export class ApplyModifierCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly stack: ModifierStack,
        private readonly index: number,
    ) { super(editor) }

    async execute(): Promise<void> {
        const { stack, editor: { modifiers, selection } } = this;
        const result = await modifiers.apply(stack);
        selection.selected.addSolid(result);
    }
}

export class RemoveModifierCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly stack: ModifierStack,
        private readonly index: number,
    ) { super(editor) }

    async execute(): Promise<void> {
        const { stack, editor: { modifiers, selection } } = this;
        await modifiers.remove(stack.premodified);
        selection.selected.addSolid(stack.premodified);
    }
}
