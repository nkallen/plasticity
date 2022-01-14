import { CompositeDisposable, Disposable } from 'event-kit';
import { AbstractDialog } from "../../command/AbstractDialog";
import { Editor } from '../../editor/Editor';
import { createRef, render } from 'preact';

export default (editor: Editor) => {
    class Dialog extends HTMLElement {
        private readonly disposable = new CompositeDisposable();

        constructor() {
            super();
            this.render = this.render.bind(this);
            this.onFailure = this.onFailure.bind(this);
            this.onSuccess = this.onSuccess.bind(this);
        }

        connectedCallback() {
            editor.signals.dialogAdded.add(this.render);
            editor.signals.dialogRemoved.add(this.render);
            editor.signals.factoryUpdateFailed.add(this.onFailure);
            editor.signals.factoryUpdated.add(this.onSuccess);
            this.disposable.add(new Disposable(() => {
                editor.signals.dialogAdded.remove(this.render);
                editor.signals.dialogRemoved.remove(this.render);
                editor.signals.factoryUpdateFailed.remove(this.render);
                editor.signals.factoryUpdated.remove(this.render);
            }));
            this.render();
        }

        disconnectedCallback() {
            this.disposable.dispose();
        }

        render(dialog?: AbstractDialog<any>) {
            if (dialog !== undefined) {
                const ref = createRef();
                const form = <div class="absolute rounded bottom-2 left-2 w-[365] bg-dialog opacity-90 overflow-clip shadow-neutral-900/95 shadow-lg">
                    <div class="my-1 border-b border-neutral-900 m">
                        <div class="flex justify-between items-center px-2">
                            <div class="flex items-center m-3 space-x-4 text-xs font-bold text-neutral-100">
                                <div>{dialog.title}</div>
                                <i data-feather="alert-circle" class="stroke-red-700"></i>
                            </div>

                            <a class="py-1 px-3 text-xs text-center align-middle rounded-full bg-neutral-800 text-neutral-400">Learn more ...</a>
                        </div>
                    </div>
                    <div ref={ref}></div>
                    <div class="flex justify-end py-1 px-2 space-x-2 border bg-neutral-900 border-neutral-900">
                        <button class="py-1 px-2 text-xs rounded text-neutral-200">Cancel</button>
                        <button class="py-1 px-2 text-xs rounded shadow-sm bg-accent-900 text-accent-100">OK</button>
                    </div>                </div>
                render(form, this);
                ref.current.appendChild(dialog);
            } else {
                render(<></>, this);
            }
        }

        onFailure(e: any) {
            this.classList.add('failure');
            this.classList.remove('success');
        }

        onSuccess() {
            this.classList.remove('failure');
            this.classList.add('success');
        }
    }
    customElements.define('plasticity-dialog', Dialog);
}