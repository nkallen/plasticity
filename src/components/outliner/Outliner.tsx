import { Editor } from '../../editor/Editor';
import { render } from 'preact';
import * as visual from '../../visual_model/VisualModel';

export default (editor: Editor) => {
    class Outliner extends HTMLElement {
        connectedCallback() {
            this.render();
            editor.signals.sceneGraphChanged.add(this.render);
        }

        disconnectedCallback() {
            editor.signals.sceneGraphChanged.remove(this.render);
        }

        render = () => {
            render(
                <div class="p-4">
                    <h1 class="mb-4 text-xs font-bold text-neutral-100">Scene collection</h1>
                    <section>
                        <h2 class="mt-4 mb-1 text-xs uppercase text-neutral-200">Solids</h2>
                        <ol class="space-y-1">
                            {editor.db.find(visual.Solid).map(solid =>
                                <li class="flex items-center justify-between px-3 py-0.5 rounded hover:bg-neutral-700">
                                    <div class="text-sm text-neutral-400">Solid {solid.view.simpleName}</div>
                                    <button class="p-1 rounded hover:bg-neutral-500 group">
                                        <plasticity-icon name="eye"></plasticity-icon>
                                    </button>
                                </li>
                            )}
                        </ol>
                    </section>
                    <section>
                        <h2 class="mt-4 mb-1 text-xs uppercase text-neutral-200">Curves</h2>
                        <ol class="space-y-1">
                            {editor.db.find(visual.SpaceInstance).map(solid =>
                                <li class="flex items-center justify-between px-3 py-0.5 rounded hover:bg-neutral-700">
                                    <div class="text-sm text-neutral-400">Curve {solid.view.simpleName}</div>
                                    <button class="p-1 rounded hover:bg-neutral-500 group">
                                        <plasticity-icon name="eye"></plasticity-icon>
                                    </button>
                                </li>
                            )}
                        </ol>
                    </section>
                </div>, this)
        }
    }

    customElements.define('plasticity-outliner', Outliner);
}