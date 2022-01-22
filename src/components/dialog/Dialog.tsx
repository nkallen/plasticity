import { CompositeDisposable, Disposable } from 'event-kit';
import { createRef, render } from 'preact';
import { AbstractDialog } from "../../command/AbstractDialog";
import { Editor } from '../../editor/Editor';

export default (editor: Editor) => {
    class Dialog extends HTMLElement {
        private readonly disposable = new CompositeDisposable();
        disconnectedCallback() { this.disposable.dispose() }

        connectedCallback() {
            editor.signals.dialogAdded.add(this.render);
            editor.signals.dialogRemoved.add(this.render);
            editor.signals.factoryUpdateFailed.add(this.onFailure);
            editor.signals.factoryUpdated.add(this.onSuccess);
            editor.signals.factoryCancelled.add(this.reset);
            editor.signals.factoryCommitted.add(this.reset);
            this.disposable.add(new Disposable(() => {
                editor.signals.dialogAdded.remove(this.render);
                editor.signals.dialogRemoved.remove(this.render);
                editor.signals.factoryUpdateFailed.remove(this.render);
                editor.signals.factoryUpdated.remove(this.render);
                editor.signals.factoryCancelled.remove(this.reset);
                editor.signals.factoryCommitted.remove(this.reset);
            }));
            this.render();
        }

        render = (dialog?: AbstractDialog<any>) => {
            if (dialog !== undefined) {
                const ref = createRef();
                const form = <div class="absolute bottom-2 left-2 w-96 rounded shadow-lg opacity-90 bg-dialog overflow-clip shadow-neutral-900/95">
                    <div class="my-1 border-b border-neutral-900 m">
                        <div class="flex justify-between items-center px-2">
                            <div class="flex items-center m-3 space-x-4 text-xs font-bold text-neutral-100">
                                <div>{dialog.name}</div>
                                <plasticity-icon name="alert" class="text-red-700 alert"></plasticity-icon>
                            </div>

                            <a class="py-1 px-3 text-xs text-center align-middle rounded-full bg-neutral-800 text-neutral-400">Learn more ...</a>
                        </div>
                    </div>
                    <div ref={ref}></div>
                    <div class="flex justify-end py-1 px-2 space-x-2 border bg-neutral-900 border-neutral-900">
                        <button class="py-1 px-2 text-xs rounded text-neutral-200" type="button" onClick={e => dialog.cancel()} tabIndex={-1}>Cancel</button>
                        <button class="py-1 px-2 text-xs rounded shadow-sm bg-accent-900 text-accent-100" type="button" onClick={e => dialog.finish()} tabIndex={-1}>OK</button>
                    </div>
                </div>
                render(form, this);
                ref.current.appendChild(dialog);
            } else {
                render(<></>, this);
            }
        }

        onFailure = (e: any) => {
            this.classList.add('failure');
            this.classList.remove('success');
        }

        onSuccess = () => {
            this.classList.remove('failure');
            this.classList.add('success');
        }

        reset = () => {
            this.classList.remove('failure');
            this.classList.remove('success');
        }
    }
    customElements.define('plasticity-dialog', Dialog);
}