import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import c3d from '../../../build/Release/c3d.node';
import * as cmd from '../../commands/Command';
import { RebuildCommand } from '../../commands/CommandLike';
import { Editor } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import { HasSelection } from '../../selection/SelectionManager';
import { Cancel, CancellablePromise, Finish } from '../../util/Cancellable';
import * as visual from '../../VisualModel';
import icons from '../toolbar/icons';
import { ChangeEvent } from './NumberScrubber';

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: GeometryDatabase
    ) { }

    get item() {
        const { selection } = this;
        if (selection.selectedSolids.size == 0) throw new Error("invalid precondition");

        const solid = selection.selectedSolids.values().next().value;
        return solid;
    }

    get creators() {
        const { db, selection } = this;
        if (selection.selectedSolids.size == 0) return [];

        const result = new Array<[number, c3d.FilletSolid]>();
        const solid = selection.selectedSolids.values().next().value;
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.SetCreator(i);
            if (creator.IsA() == c3d.CreatorType.FilletSolid) {
                result.push([i, creator.Cast<c3d.FilletSolid>(c3d.CreatorType.FilletSolid)]);
            }
        }

        return result;
    }
}

export default (editor: Editor) => {
    class Modifiers extends HTMLElement {
        private readonly dispose = new CompositeDisposable();
        private readonly model = new Model(editor.selection, editor.db);

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
            const result = <ol>
                {this.model.creators.map(([i, c]) => {
                    const params = c.GetParameters();
                    const Z = "ispace-creator"
                    return <li>
                        <Z parameters={params} index={i} item={this.model.item}></Z>
                    </li>
                })}
            </ol>;
            render(result, this);
        }

        disconnectedCallback() {
            this.dispose!.dispose();
        }
    }
    customElements.define('ispace-modifiers', Modifiers);

    type CreatorState = { tag: 'none' } | { tag: 'updating', cb?: () => void, creator: c3d.FilletSolid, resolve: (value: void | PromiseLike<void>) => void, reject: (value: void | PromiseLike<void>) => void }

    class Creator extends HTMLElement {
        private state: CreatorState = { tag: 'none' };

        constructor() {
            super();
            this.render = this.render.bind(this);
            this.onClick = this.onClick.bind(this);
            this.onChange = this.onChange.bind(this);
            this.onScrub = this.onScrub.bind(this);
            this.onFinish = this.onFinish.bind(this);
        }

        _index!: number;
        set index(index: number) {
            this._index = index;
        }
        get index() { return this._index }

        _parameters!: c3d.SmoothValues;
        set parameters(p: c3d.SmoothValues) {
            this._parameters = p;
        }
        get parameters() { return this._parameters }

        _item!: visual.Item;
        set item(item: visual.Item) {
            this._item = item;
        }

        get item() { return this._item }

        connectedCallback() {
            this.render();
        }

        onChange(e: Event) {
            if (e.target instanceof HTMLInputElement) {
                if (e.target.type !== 'text') throw new Error("invalid precondition");
            } else if (e.target instanceof HTMLSelectElement) {
            } else {
                throw new Error("invalid precondition");
            }

            const key = e.target.name as keyof c3d.SmoothValues;
            const value = Number(e.target.value) as c3d.SmoothValues[keyof c3d.SmoothValues];
            this.commit(key, value);
        }

        onClick(e: Event) {
            if (!(e.target instanceof HTMLInputElement)) throw new Error("invalid precondition");
            if (e.target.type !== 'checkbox') throw new Error("invalid precondition");

            const key = e.target.name as keyof c3d.SmoothValues;
            const value = e.target.checked as c3d.SmoothValues[keyof c3d.SmoothValues];
            this.commit(key, value);
        }

        private commit<K extends keyof c3d.SmoothValues>(key: K, value: c3d.SmoothValues[K]): void {
            const command = new RebuildCommand(editor, this.item, {
                execute<T>(cb?: () => T): CancellablePromise<void> {
                    return CancellablePromise.resolve();
                }
            });
            editor.enqueue(command);
            const creator = command.dup.SetCreator(this.index).Cast<c3d.FilletSolid>(c3d.CreatorType.FilletSolid);
            this.parameters[key] = value;
            creator.SetParameters(this.parameters);
        }

        private update<K extends keyof c3d.SmoothValues>(key: K, value: c3d.SmoothValues[K]): void {
            switch (this.state.tag) {
                case 'none': {
                    const that = this;
                    const command = new RebuildCommand(editor, this.item, {
                        execute(cb?: () => void): CancellablePromise<void> {
                            return new CancellablePromise<void>((resolve, reject) => {
                                const cancel = () => reject(Cancel);
                                const finish = () => reject(Finish);

                                const creator = command.dup.SetCreator(that.index).Cast<c3d.FilletSolid>(c3d.CreatorType.FilletSolid);
                                creator.SetParameters(that.parameters);
                                that.state = { tag: 'updating', cb, resolve, reject, creator };
                                try { if (cb) cb() }
                                catch (e) { console.error(e) }
                                return { cancel, finish };
                            });
                        }
                    });
                    editor.enqueue(command);
                    break;
                }
                case 'updating':
                    const creator = this.state.creator;
                    this.parameters[key] = value;
                    creator.SetParameters(this.parameters);
                    try { if (this.state.cb) this.state.cb() }
                    catch (e) { console.error(e) }
            }
        }

        onScrub(e: ChangeEvent) {
            if (!(e.target instanceof HTMLElement)) throw new Error("invalid precondition");
            const key = e.target.getAttribute('name') as keyof c3d.SmoothValues;
            const value = Number(e.target.getAttribute('value') ?? '0');
            this.update(key, value);
        }

        onFinish(e: Event) {
            switch (this.state.tag) {
                case 'updating':
                    this.state.resolve();
                    this.state = { tag: 'none' };
                    break;
                default:
                    throw new Error("invalid state");
            }
        }

        render() {
            const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.parameters;

            render(
                <>
                    <div class="header">
                        <input type="checkbox" />
                        <img title="test" src={icons.get(cmd.FilletCommand)}></img>
                        <div class="name">Fillet</div>
                    </div>
                    <form>
                        <ul>
                            <li>
                                <label for="distance1">distance1</label>
                                <ispace-number-scrubber name="distance1" value={distance1} onchange={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="distance2">distance2</label>
                                <ispace-number-scrubber name="distance2" value={distance2} onchange={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="conic">conic</label>
                                <ispace-number-scrubber name="conic" value={conic} onchange={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="begLength">begLength</label>
                                <ispace-number-scrubber name="begLength" value={begLength} onchange={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="endLength">endLength</label>
                                <ispace-number-scrubber name="endLength" value={endLength} onchange={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="form">form</label>
                                <select name="form" value={form} onChange={this.onChange}>
                                    <option value="-1">Span</option>
                                    <option value="0">Fillet</option>
                                    <option value="1">Chamfer</option>
                                    <option value="2">Slant1</option>
                                    <option value="3">Slant2</option>
                                </select>
                            </li>
                            <li>
                                <label for="smoothCorner">smoothCorner</label>
                                <select name="smoothCorner" value={smoothCorner} onChange={this.onChange}>
                                    <option value="0">Pointed</option>
                                    <option value="1">Either</option>
                                    <option value="2">Uniform</option>
                                    <option value="3">Sharp</option>
                                </select>
                            </li>
                            <li>
                                <label for="prolong">prolong</label>
                                <input type="checkbox" name="prolong" checked={prolong} onClick={this.onClick}></input>
                            </li>
                            <li>
                                <label for="keepCant">keepCant</label>
                                <input type="checkbox" name="keepCant" value={keepCant} onClick={this.onClick}></input>
                            </li>
                            <li>
                                <label for="strict">strict</label>
                                <input type="checkbox" name="strict" checked={strict} onClick={this.onClick}></input>
                            </li>
                            <li>
                                <label for="equable">equable</label>
                                <input type="checkbox" name="equable" checked={equable} onClick={this.onClick}></input>
                            </li>
                        </ul>
                    </form>
                </>, this);
        }
    }
    customElements.define('ispace-creator', Creator);

}
