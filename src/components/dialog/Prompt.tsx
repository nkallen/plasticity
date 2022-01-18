import { CompositeDisposable, Disposable } from 'event-kit';
import { Editor } from '../../editor/Editor';
import { CancellablePromise } from '../../util/CancellablePromise';
import { render } from 'preact';

export type State = { tag: 'none' } | { tag: 'executing' } | { tag: 'finished' }

export class Prompt extends HTMLElement {
    private state: State = { tag: 'none' };

    private _name!: string;
    get name() { return this._name }
    set name(name: string) {
        this.setAttribute('name', name); // used by AbstractDialog to find the prompt
        this._name = name;
    }

    private _description!: string;
    get description() { return this._description }
    set description(description: string) { this._description = description }

    connectedCallback() { this.render() }
    disconnectedCallback() { }

    render() {
        const { name, description, state: { tag } } = this;
        let icon;
        switch (tag) {
            case 'executing': icon = <div class="w-4 h-4 rounded-full bg-neutral-600"> <div class="w-full h-full rounded-full bg-neutral-600 animate-ping"> </div></div>; break;
            case 'finished': icon = <plasticity-icon name="check" class="bg-green-600 rounded-full"></plasticity-icon>; break;
            default: icon = <div class="w-4 h-4 rounded-full bg-transparent"> </div>; break;;
        }

        render(<li class={`flex items-center py-1 px-1 space-x-2 text-xs rounded-full ${tag === 'executing' ? 'bg-neutral-800' : ''} cursor-pointer`}>
            {icon}
            <div class="font-bold text-neutral-200">{name}</div> <div class="text-neutral-500">{description}</div>
        </li>, this);
    }

    execute() {
        const cancellable = new CancellablePromise<void>((resolve, reject) => {
            const disposables = new CompositeDisposable();
            disposables.add(new Disposable(() => {
                this.state = { tag: 'finished' };
                this.render();
            }));

            return { dispose: () => disposables.dispose(), finish: resolve };
        });
        this.state = { tag: 'executing' };
        this.render();
        return cancellable;
    }
}

export default (editor: Editor) => {
    customElements.define('plasticity-prompt', Prompt);
}