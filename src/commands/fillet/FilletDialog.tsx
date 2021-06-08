import { CompositeDisposable, Disposable } from "event-kit";
import c3d from '../../../build/Release/c3d.node';
import { EditorSignals } from "../../Editor";
import { Cancel, CancellablePromise, Finish } from "../../util/Cancellable";
import { render } from 'preact';
import { FilletParams } from "./FilletFactory";

type State<T> = { tag: 'none' } | { tag: 'executing', cb: (sv: T) => void, finish: () => void, cancel: () => void }

export abstract class AbstractDialog<T> extends HTMLElement {
    private state: State<T> = { tag: 'none' };
    protected abstract readonly params: T;

    constructor(private readonly signals: EditorSignals) {
        super();
        this.render = this.render.bind(this);
        this.onChange = this.onChange.bind(this);
    }

    abstract render(): void;

    onChange(e: Event) {
        switch (this.state.tag) {
            case 'executing':
                if (e.target instanceof HTMLInputElement) {
                } else if (e.target instanceof HTMLSelectElement) {
                } else if (e.target instanceof HTMLElement && e.target.tagName == 'ISPACE-NUMBER-SCRUBBER') {
                } else {
                    throw new Error("invalid precondition");
                }

                const key = e.target.getAttribute('name') as keyof T;
                const value = Number(e.target.getAttribute('value')) as unknown as T[keyof T];
                this.params[key] = value;
                this.state.cb(this.params);
                break;
            default: throw new Error('invalid state');
        }
    }

    execute(cb: (sv: T) => void) {
        return new CancellablePromise<T>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            disposables.add(new Disposable(() => this.state = { tag: 'none' }));

            this.signals.dialogAdded.dispatch(this);
            disposables.add(new Disposable(() => this.signals.dialogRemoved.dispatch()));
            const cancel = () => {
                disposables.dispose();
                reject(Cancel);
            }
            const finish = () => {
                disposables.dispose();
                reject(Finish);
            }
            this.state = { tag: 'executing', cb, finish,cancel };
            return { cancel, finish };
        });
    }

    finish() {
        switch (this.state.tag) {
            case 'executing': this.state.finish();
                break;
            case 'none': throw new Error('invalid precondition');
        }
    }

    cancel() {
        switch (this.state.tag) {
            case 'executing': this.state.cancel();
                break;
            case 'none': throw new Error('invalid precondition');
        }
    }

    connectedCallback() { this.render() }
    disconnectedCallback() { }
}

export class FilletDialog extends AbstractDialog<FilletParams> {
    constructor(protected readonly params: FilletParams, signals: EditorSignals) {
        super(signals);
    }

    render() {
        const { distance1, distance2, conic, begLength, endLength, form, smoothCorner, prolong, keepCant, strict, equable } = this.params;
        render(
            <ul>
                <li>
                    <label for="distance1">distance1</label>
                    <ispace-number-scrubber name="distance1" value={distance1} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="distance2">distance2</label>
                    <ispace-number-scrubber name="distance2" value={distance2} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="conic">conic</label>
                    <ispace-number-scrubber name="conic" value={conic} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="begLength">begLength</label>
                    <ispace-number-scrubber name="begLength" value={begLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="endLength">endLength</label>
                    <ispace-number-scrubber name="endLength" value={endLength} onchange={this.onChange} onscrub={this.onChange} onfinish={this.onChange}></ispace-number-scrubber>
                </li>
                <li>
                    <label for="form">form</label>
                    <select name="form" value={form} onChange={this.onChange}>
                        <option value="-1">Span</option>
                        <option value="0">Fillet</option>
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
                    <input type="checkbox" name="prolong" checked={prolong} onClick={this.onChange}></input>
                </li>
                <li>
                    <label for="keepCant">keepCant</label>
                    <select name="keepCant" value={keepCant} onChange={this.onChange}>
                        <option value="-1">Keep</option>
                        <option value="1">Unkeep</option>
                    </select>
                </li>
                <li>
                    <label for="strict">strict</label>
                    <input type="checkbox" name="strict" checked={strict} onChange={this.onChange}></input>
                </li>
                <li>
                    <label for="equable">equable</label>
                    <input type="checkbox" name="equable" checked={equable} onChange={this.onChange}></input>
                </li>

            </ul>, this);
    }
}
customElements.define('fillet-dialog', FilletDialog);
