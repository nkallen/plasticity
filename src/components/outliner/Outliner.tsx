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
                    <section>
                        <h1 class="mb-4 text-xs font-bold text-neutral-100">Solids</h1>
                        <ol class="space-y-1">
                            {editor.db.find(visual.Solid).map(solid =>
                                <li class="flex justify-between items-center py-0.5 px-3 rounded hover:bg-neutral-700">
                                    <div class="text-sm text-neutral-400">Solid {solid.view.simpleName}</div>
                                    <button class="p-1 rounded group hover:bg-neutral-500">
                                        <plasticity-icon name="eye"></plasticity-icon>
                                    </button>
                                </li>
                            )}
                        </ol>
                    </section>
                    <section>
                        <h1 class="mb-4 text-xs font-bold text-neutral-100">Curves</h1>
                        <ol class="space-y-1">
                            {editor.db.find(visual.SpaceInstance).map(solid =>
                                <li class="flex justify-between items-center py-0.5 px-3 rounded hover:bg-neutral-700">
                                    <div class="text-sm text-neutral-400">Curve {solid.view.simpleName}</div>
                                    <button class="p-1 rounded group hover:bg-neutral-500">
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