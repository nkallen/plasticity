import { render } from 'preact';
import { Editor } from '../../editor/Editor';

export default (editor: Editor) => {
    class Clipboard extends HTMLElement {
        connectedCallback() {
            this.render();
            editor.signals.clipboardChanged.add(this.render);
        }

        disconnectedCallback() {
            editor.signals.clipboardChanged.remove(this.render);
        }

        render = () => {
            render(
                <div class="p-4">
                    <h1 class="mb-4 text-xs font-bold text-neutral-100">Clipboard</h1>
                    <ol class="space-y-1">
                        {editor.clipboard.all.map(({ name }, i) =>
                            <li class="flex justify-between items-center py-0.5 px-3 rounded hover:bg-neutral-700" onClick={e => this.onClick(e, i)}>
                                <div class="text-xs text-neutral-400">{name}</div>
                            </li>
                        )}
                    </ol>

                </div>, this)
        }

        onClick = (event: MouseEvent, i: number) => {
            editor.clipboard.paste(i);
        }
    }

    customElements.define('plasticity-clipboard', Clipboard);
}