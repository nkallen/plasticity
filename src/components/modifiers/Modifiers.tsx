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

        const solid = selection.selectedSolids.first;
        return solid;
    }

    get creators() {
        const { db, selection } = this;
        if (selection.selectedSolids.size == 0) return [];

        const result = new Array<[number, c3d.Creator]>();
        const solid = selection.selectedSolids.first!;
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.SetCreator(i);
            result.push([i, creator.Cast<any>(creator.IsA())]);
        }

        return result;
    }
}

const map: Record<number, string> = {
    501: "shell-creator",
    502: "simple-creator",
    503: "elementary-solid",
    504: "curve-swept-solid",
    505: "curve-extrusion-solid",
    506: "curve-revolution-solid",
    507: "curve-evolution-solid",
    508: "curve-lofted-solid",
    509: "boolean-solid",
    510: "cutting-solid",
    511: "symmetry-solid",
    512: "hole-solid",
    513: "smooth-solid",
    514: "chamfer-solid",
    515: "fillet-solid",
    516: "full-fillet-solid",
    517: "shell-solid",
    518: "draft-solid",
    519: "rib-solid",
    520: "split-shell",
    521: "nurbs-block-solid",
    522: "face-modified-solid",
    523: "modified-nurbs-item",
    524: "nurbs-modification",
    525: "transformed-solid",
    526: "thin-shell-creator",
    527: "union-solid",
    528: "detach-solid",
    529: "duplication-solid",
    530: "reverse-creator",
    531: "divided-shell",
};

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
                    const Z = `ispace-creator-${map[c.IsA()]}`;
                    // @ts-expect-error("not sure how to type this")
                    return <li><Z creator={c} index={i} item={this.model.item}></Z></li>
                })}
            </ol>;
            render(result, this);
        }

        disconnectedCallback() {
            this.dispose!.dispose();
        }
    }
    customElements.define('ispace-modifiers', Modifiers);

    type CreatorState<C> = { tag: 'none' } | { tag: 'updating', cb?: () => void, creator: C, resolve: (value: void | PromiseLike<void>) => void, reject: (value: void | PromiseLike<void>) => void }

    class Creator<C extends c3d.Creator, T> extends HTMLElement {
        private state: CreatorState<C> = { tag: 'none' };

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

        _creator!: c3d.Creator;
        set creator(p: c3d.Creator) {
            this._creator = p;
        }
        get creator() { return this._creator }

        _item!: visual.Item;
        set item(item: visual.Item) {
            this._item = item;
        }

        get item() { return this._item }

        connectedCallback() { this.render() }

        onChange(e: Event) {
            if (e.target instanceof HTMLInputElement) {
                if (e.target.type !== 'text') throw new Error("invalid precondition");
            } else if (e.target instanceof HTMLSelectElement) {
            } else if (e.target instanceof HTMLElement && e.target.tagName == 'ISPACE-NUMBER-SCRUBBER') {
            } else {
                throw new Error("invalid precondition");
            }

            const key = e.target.getAttribute('name') as keyof T;
            const value = Number(e.target.getAttribute('value')) as unknown as T[keyof T];
            this.commit(key, value);
        }

        onClick(e: Event) {
            if (!(e.target instanceof HTMLInputElement)) throw new Error("invalid precondition");
            if (e.target.type !== 'checkbox') throw new Error("invalid precondition");

            const key = e.target.name as keyof T;
            const value = e.target.checked as unknown as T[keyof T];
            this.commit(key, value);
        }

        private commit<K extends keyof T>(key: K, value: T[K]): void {
            const command = new RebuildCommand(editor, this.item, {
                execute<T>(cb?: () => T): CancellablePromise<void> {
                    return CancellablePromise.resolve();
                }
            });
            editor.enqueue(command);
            const creator = command.dup.SetCreator(this.index).Cast<C>(this.creator.IsA());
            this.set(creator, key, value);
        }

        set<K extends keyof T>(creator: C, key: K, value: T[K]) {
            throw new Error("unimplemented");
        }

        private update<K extends keyof T>(key: K, value: T[K]): void {
            switch (this.state.tag) {
                case 'none': {
                    const that = this;
                    const command = new RebuildCommand(editor, this.item, {
                        execute(cb?: () => void): CancellablePromise<void> {
                            return new CancellablePromise<void>((resolve, reject) => {
                                const cancel = () => reject(Cancel);
                                const finish = () => reject(Finish);

                                const creator = command.dup.SetCreator(that.index).Cast<C>(that.creator.IsA());
                                that.set(creator, key, value);
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
                    this.set(creator, key, value);
                    try { if (this.state.cb) this.state.cb() }
                    catch (e) { console.error(e) }
            }
        }

        onScrub(e: ChangeEvent) {
            if (!(e.target instanceof HTMLElement)) throw new Error("invalid precondition");
            const key = e.target.getAttribute('name') as keyof T;
            const value = Number(e.target.getAttribute('value') ?? '0') as unknown as T[keyof T];
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
            render(
                <div class="header">
                    <input type="checkbox" />
                    <img title="test" src={icons.get(cmd.FilletCommand)}></img>
                    <div class="name">{map[this.creator.IsA()]}</div>
                </div>, this);
        }
    }
    customElements.define('ispace-creator', Creator);

    class FilletCreator extends Creator<c3d.FilletSolid, c3d.SmoothValues> {
        set<K extends keyof c3d.SmoothValues>(creator: c3d.FilletSolid, key: K, value: c3d.SmoothValues[K]) {
            const parameters = creator.GetParameters();
            parameters[key] = value;
            creator.SetParameters(parameters);
        }

        render() {
            const creator = this.creator as c3d.FilletSolid;
            const parameters = creator.GetParameters();
            const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = parameters;

            render(
                <>
                    <div class="header">
                        <input type="checkbox" />
                        <img title="test" src={icons.get(cmd.FilletCommand)}></img>
                        <div class="name">Fillet</div>
                    </div>
                    <form onSubmit={e => { e.preventDefault(); return false }}>
                        <ul>
                            <li>
                                <label for="distance1">distance1</label>
                                <ispace-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="distance2">distance2</label>
                                <ispace-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="conic">conic</label>
                                <ispace-number-scrubber name="conic" value={conic} onchange={this.onChange} onscrub={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="begLength">begLength</label>
                                <ispace-number-scrubber name="begLength" value={begLength} onchange={this.onChange} onscrub={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
                            </li>
                            <li>
                                <label for="endLength">endLength</label>
                                <ispace-number-scrubber name="endLength" value={endLength} onchange={this.onChange} onscrub={this.onScrub} onfinish={this.onFinish}></ispace-number-scrubber>
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
    customElements.define('ispace-creator-fillet-solid', FilletCreator);

    for (const key of Object.values(map)) {
        if (key == 'fillet-solid') continue;
        class Foo extends Creator<any, any> {};
        customElements.define(`ispace-creator-${key}`, Foo);
    }
}
