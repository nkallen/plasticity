import { render } from 'preact';
import { Editor } from '../../editor/Editor';

export default (editor: Editor) => {
    class Undo extends HTMLElement {
        connectedCallback() {
            this.render();
            editor.signals.historyChanged.add(this.render);
            editor.signals.historyAdded.add(this.render);
        }

        disconnectedCallback() {
            editor.signals.historyChanged.remove(this.render);
            editor.signals.historyAdded.remove(this.render);
        }

        render = () => {
            render(
                <div class="p-4">
                    <h1 class="mb-4 text-xs font-bold text-neutral-100">Undo history</h1>
                    <ol class="space-y-1">
                        {editor.history.undoStack.map(([name, memento]) =>
                            <li class="flex justify-between items-center py-0.5 px-3 rounded hover:bg-neutral-700">
                                <div class="text-xs text-neutral-400">{name}</div>
                            </li>
                        )}
                    </ol>

                </div>, this)
        }
    }

    customElements.define('plasticity-undo-history', Undo);
}