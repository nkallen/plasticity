import { Disposable } from 'event-kit';
import { Editor } from '../../editor/Editor';


export default (editor: Editor) => {
    class Tooltip extends HTMLElement {
        dispose?: Disposable

        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            this.dispose = editor.tooltips.add(this.parentElement, {
                title: this.innerHTML,
                placement: this.getAttribute('placement') ?? undefined,
                keyBindingCommand: this.getAttribute('command'),
            });
        }

        disconnectedCallback() { this.dispose!.dispose() }
    }
    customElements.define('plasticity-tooltip', Tooltip);
}