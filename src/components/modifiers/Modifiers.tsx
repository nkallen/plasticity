import c3d from '../../../build/Release/c3d.node';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { CompositeDisposable, Disposable } from 'event-kit';
import { GeometryDatabase } from '../../GeometryDatabase';
import { HasSelection } from '../../selection/SelectionManager';
import { render, createRef } from 'preact';

export class Model {
    constructor(
        private readonly selection: HasSelection,
        private readonly db: GeometryDatabase
    ) { }

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
                    const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = x;
                    const y = { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable };
                    console.log(y);
                    const Z = "ispace-creator"
                    return <li>
                        <Z parameters={x}></Z>
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
        _parameters!: c3d.SmoothValues;

        set parameters(p: c3d.SmoothValues) {
            this._parameters = p;
        }

        get parameters() {
            return this._parameters;
        }

        connectedCallback() {
            this.render();
        }

        render() {
            const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.parameters;

            render(<form>
                <ul>
                    <li>
                        <label for="distance1">distance1</label>
                        <input type="text" name="distance1" value={distance1}></input>
                    </li>
                    <li>
                        <label for="distance2">distance2</label>
                        <input type="text" name="distance2" value={distance2}></input>
                    </li>
                    <li>
                        <label for="conic">conic</label>
                        <input type="text" name="conic" value={conic}></input>
                    </li>
                    <li>
                        <label for="begLength">begLength</label>
                        <input type="text" name="begLength" value={begLength}></input>
                    </li>
                    <li>
                        <label for="endLength">endLength</label>
                        <input type="text" name="endLength" value={endLength}></input>
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
                        <input type="checkbox" name="prolong" checked={prolong}></input>
                    </li>
                    <li>
                        <label for="keepCant">keepCant</label>
                        <input type="text" name="keepCant" value={keepCant}></input>
                    </li>
                    <li>
                        <label for="distance1">strict</label>
                        <input type="checkbox" name="strict" checked={strict}></input>
                    </li>
                    <li>
                        <label for="equable">equable</label>
                        <input type="checkbox" name="equable" checked={equable}></input>
                    </li>
                </ul>
            </form>, this);
        }
    }
    customElements.define('ispace-creator', Creator);
}
