import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import c3d from '../../../build/Release/c3d.node';
import { Editor } from '../../Editor';
import { GeometryDatabase } from '../../GeometryDatabase';
import { HasSelection } from '../../selection/SelectionManager';
import * as visual from '../../VisualModel';

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

        const result = [];
        const solid = selection.selectedSolids.values().next().value;
        const model = db.lookup(solid);
        for (let i = 0, l = model.GetCreatorsCount(); i < l; i++) {
            const creator = model.GetCreator(i);
            if (creator.IsA() == c3d.CreatorType.FilletSolid) {
                result.push(creator.Cast<c3d.FilletSolid>(c3d.CreatorType.FilletSolid));
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
                {this.model.creators.map(c => {
                    const x = c.GetParameters();
                    const Z = "ispace-creator"
                    return <li>
                        <Z parameters={x} creator={c} item={this.model.item}></Z>
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

    class Creator extends HTMLElement {
        constructor() {
            super();
            this.render = this.render.bind(this);
            this.onClick = this.onClick.bind(this);
            this.onChange = this.onChange.bind(this);
        }

        _creator!: c3d.FilletSolid;
        set creator(creator: c3d.FilletSolid) {
            this._creator = creator;
        }
        get creator() { return this._creator };

        _parameters!: c3d.SmoothValues;
        set parameters(p: c3d.SmoothValues) {
            this._parameters = p;
        }

        get parameters() {
            return this._parameters;
        }

        _item!: visual.Item;
        set(item: visual.Item) {
            this._item = item;
        }

        get item() { return this._item }

        connectedCallback() {
            this.render();
        }

        onChange(e: Event) {
            if (!(e.target instanceof HTMLInputElement)) throw new Error("invalid precondition");
            if (e.target.type !== 'text') throw new Error("invalid precondition");

            const key = e.target.name as keyof c3d.SmoothValues;
            const value = Number(e.target.value) as c3d.SmoothValues[keyof c3d.SmoothValues];
            this.change(key, value);
        }

        onClick(e: Event) {
            if (!(e.target instanceof HTMLInputElement)) throw new Error("invalid precondition");
            if (e.target.type !== 'checkbox') throw new Error("invalid precondition");

            const key = e.target.name as keyof c3d.SmoothValues;
            const value = e.target.checked as c3d.SmoothValues[keyof c3d.SmoothValues];
            this.change(key, value);
        }

        private change<K extends keyof c3d.SmoothValues>(key: K, value: c3d.SmoothValues[K]): void {
            this.parameters[key] = value;
            this.creator.SetParameters(this.parameters);
            editor.signals.creatorChanged.dispatch({ creator: this._creator, item: this.item })
        }

        render() {
            const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.parameters;

            render('', this)
            render(<form>
                <ul>
                    <li>
                        <label for="distance1">distance1</label>
                        <input type="text" name="distance1" value={distance1} onChange={this.onChange}></input>
                    </li>
                    <li>
                        <label for="distance2">distance2</label>
                        <input type="text" name="distance2" value={distance2} onChange={this.onChange}></input>
                    </li>
                    <li>
                        <label for="conic">conic</label>
                        <input type="text" name="conic" value={conic} onChange={this.onChange}></input>
                    </li>
                    <li>
                        <label for="begLength">begLength</label>
                        <input type="text" name="begLength" value={begLength} onChange={this.onChange}></input>
                    </li>
                    <li>
                        <label for="endLength">endLength</label>
                        <input type="text" name="endLength" value={endLength} onChange={this.onChange}></input>
                    </li>
                    <li>
                        <label for="form">form</label>
                        <input type="text" name="form" value={form}></input>
                    </li>
                    <li>
                        <label for="smoothCorner">smoothCorner</label>
                        <input type="text" name="smoothCorner" value={smoothCorner}></input>
                    </li>
                    <li>
                        <label for="prolong">prolong</label>
                        <input type="checkbox" name="prolong" checked={prolong} onClick={this.onClick}></input>
                    </li>
                    <li>
                        <label for="keepCant">keepCant</label>
                        <input type="text" name="keepCant" value={keepCant}></input>
                    </li>
                    <li>
                        <label for="distance1">strict</label>
                        <input type="checkbox" name="strict" checked={strict} onClick={this.onClick}></input>
                    </li>
                    <li>
                        <label for="equable">equable</label>
                        <input type="checkbox" name="equable" checked={equable} onClick={this.onClick}></input>
                    </li>
                </ul>
            </form>, this);
        }
    }
    customElements.define('ispace-creator', Creator);
}
