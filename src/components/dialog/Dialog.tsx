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
            if (dialog) {
                const ref = createRef();
                const form = <form onSubmit={e => { e.preventDefault(); return false }}>
                    <div ref={ref}></div>
                    <button type="button" onClick={e => dialog.cancel()} tabIndex={-1}>Cancel</button>
                    <button type="button" onClick={e => dialog.finish()} tabIndex={-1}>Ok</button>
                </form>
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
    customElements.define('ispace-dialog', Dialog);
}