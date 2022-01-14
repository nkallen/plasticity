import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import { Executable } from './Quasimode';
import { EditorSignals } from '../editor/EditorSignals';
import { CancellablePromise } from '../util/CancellablePromise';

export type State = { tag: 'none' } | { tag: 'executing', cb?: () => void, cancellable: CancellablePromise<void> } | { tag: 'finished' }

export class CommandPrompt extends HTMLElement implements Executable<void, void> {
    private state: State = { tag: 'none' };

    connectedCallback() { this.render() }
    disconnectedCallback() { }

    constructor(private readonly heading: string, private readonly description: string, private readonly signals: EditorSignals) {
        super();
        this.render = this.render.bind(this);
    }

    execute(cb?: () => void) {
        const cancellable = new CancellablePromise<void>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            disposables.add(new Disposable(() => this.state = { tag: 'none' }));

            this.signals.promptAdded.dispatch(this);
            disposables.add(new Disposable(() => this.signals.promptRemoved.dispatch()));

            return { dispose: () => disposables.dispose(), finish: resolve };
        });
        this.state = { tag: 'executing', cb, cancellable };
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

    render() {
        render(<div role="alert">
            <div class="title">
                {this.heading}
            </div>
            <div class="border border-t-0 border-red-400 rounded-b bg-red-100 px-4 py-3 text-red-700">
                <p>{this.description}</p>
            </div>
        </div>, this);
    }
}
customElements.define('plasticity-command-prompt', CommandPrompt);

export function Prompt<T>(header: string, description: string, signals: EditorSignals, promise: CancellablePromise<T>): CancellablePromise<T> {
    const prompt = new CommandPrompt(header, description, signals);
    const p = prompt.execute();
    promise.then(() => p.finish(), () => p.finish());
    return promise;
}
