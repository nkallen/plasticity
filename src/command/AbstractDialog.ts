import { CompositeDisposable, Disposable } from "event-kit";
import { Prompt } from "../components/dialog/Prompt";
import { EditorSignals } from "../editor/EditorSignals";
import { CancellablePromise } from "../util/CancellablePromise";
import { Executable } from "./Quasimode";

type PromptState = { tag: 'none' } | { tag: 'executing', finish: () => void }
type DialogState<T> = { tag: 'none' } | { tag: 'executing', cb: (sv: T) => void, cancellable: CancellablePromise<void>, prompt: PromptState } | { tag: 'finished' }

export abstract class AbstractDialog<T> extends HTMLElement implements Executable<T, void> {
    private state: DialogState<T> = { tag: 'none' };
    protected abstract readonly params: T;

    connectedCallback() { this.render() }
    disconnectedCallback() { }

    constructor(private readonly signals: EditorSignals) {
        super();
        this.render = this.render.bind(this);
    }

    abstract get title(): string;
    abstract render(): void;

    protected onChange = (e: Event) => {
        e.stopPropagation();
        switch (this.state.tag) {
            case 'executing':
                let value: any = undefined;
                if (e.target instanceof HTMLInputElement) {
                    if (e.target.type === 'checkbox')
                        value = e.target.checked;
                    else if (e.target.type === 'text')
                        value = e.target.value;
                    else if (e.target.type === 'radio')
                        value = Number(e.target.value);
                } else if (e.target instanceof HTMLSelectElement) {
                    value = e.target.value;
                } else if (e.target instanceof HTMLElement && e.target.tagName == 'PLASTICITY-NUMBER-SCRUBBER') {
                    value = Number(e.target.getAttribute('value'));
                } else {
                    throw new Error("invalid precondition");
                }

                const key = e.target.getAttribute('name')!;
                if (/\./.test(key)) {
                    const [key1, key2] = key.split(/\./);
                    this.params[key1 as keyof T][key2 as keyof T[keyof T]] = value;
                } else {
                    this.params[key as keyof T] = value as unknown as T[keyof T];
                }
                this.state.cb(this.params);
                break;
            default: throw new Error('invalid state');
        }
    }

    execute(cb: (sv: T) => void) {
        const cancellable = new CancellablePromise<void>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            disposables.add(new Disposable(() => this.state = { tag: 'none' }));

            this.signals.dialogAdded.dispatch(this);
            disposables.add(new Disposable(() => this.signals.dialogRemoved.dispatch()));

            return { dispose: () => disposables.dispose(), finish: resolve };
        });
        this.state = { tag: 'executing', cb, cancellable, prompt: { tag: 'none' } };
        return cancellable;
    }

    finish() {
        switch (this.state.tag) {
            case 'executing': this.state.cancellable.finish();
                this.state = { tag: 'finished' };
                break;
            case 'none': throw new Error('invalid precondition');
        }
    }

    cancel() {
        switch (this.state.tag) {
            case 'executing': this.state.cancellable.cancel();
                break;
            case 'none': throw new Error('invalid precondition');
        }
    }

    prompt<T>(key: string, execute: () => CancellablePromise<T>, clear?: () => void, replace = false): () => CancellablePromise<T> {
        switch (this.state.tag) {
            case 'executing':
                const element = this.querySelector(`plasticity-prompt[name='${key}']`);
                if (element === null) throw new Error("invalid prompt: " + key);
                const prompt = element as Prompt;
                if (!replace && prompt.onclick !== null) throw new Error("Already bound");
                const trigger = () => {
                    switch (this.state.tag) {
                        case 'executing':
                            switch (this.state.prompt.tag) {
                                case 'executing':
                                    this.state.prompt.finish();
                                case 'none':
                                    const p = prompt.execute();
                                    const executed = execute();
                                    this.state.prompt = { tag: 'executing', finish: () => { p.finish(); executed.finish() } }
                                    return executed;
                            }
                        default: throw new Error('invalid state');
                    }
                }
                prompt.onclick = trigger;
                prompt.onclear = clear;
                prompt.render();
                return trigger;
            default: throw new Error('invalid state');
        }
    }

    replace<T>(key: string, execute: () => CancellablePromise<T>, clear?: () => void): () => CancellablePromise<T> {
        return this.prompt(key, execute, clear, true);
    }
}
