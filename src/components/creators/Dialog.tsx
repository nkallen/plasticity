import { CompositeDisposable, Disposable } from 'event-kit';
import { AbstractDialog } from "../../commands/AbstractDialog";
import { Editor } from '../../editor/Editor';
import { createRef, render } from 'preact';

export default (editor: Editor) => {
    class Dialog extends HTMLElement {
        private readonly dispose = new CompositeDisposable();

        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            editor.signals.dialogAdded.add(this.render);
            editor.signals.dialogRemoved.add(this.render);
            this.dispose.add(new Disposable(() => {
                editor.signals.dialogAdded.remove(this.render);
                editor.signals.dialogRemoved.remove(this.render);
            }));
            this.render();
        }

        render(dialog?: AbstractDialog<any>) {
            if (dialog) {
                const ref = createRef();
                const form = <form onSubmit={e => { e.preventDefault(); return false }}>
                    <div ref={ref}></div>
                    <button type="button" onClick={e => dialog.cancel()}>Cancel</button>
                    <button type="button" onClick={e => dialog.finish()}>Ok</button>
                </form>
                render(form, this);
                ref.current.appendChild(dialog);
            } else {
                render(<></>, this);
            }
        }

        disconnectedCallback() {
            this.dispose!.dispose();
        }
    }
    customElements.define('ispace-dialog', Dialog);

}