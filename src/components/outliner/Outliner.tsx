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
                <div class="py-3 px-4">
                    <section>
                        <h1 class="mt-3 text-xs font-bold text-neutral-100">Solids</h1>
                        <ol class="space-y-1">
                            {editor.db.find(visual.Solid).map(solid =>
                                <li class="flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700">
                                    <plasticity-icon name="corner-box" class="text-accent-500"></plasticity-icon>
                                    <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">Solid {solid.view.simpleName}</div>
                                    <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500">
                                        <plasticity-icon name="eye"></plasticity-icon>
                                    </button>
                                </li>
                            )}
                        </ol>
                    </section>
                    <section>
                        <h1 class="mt-3 text-xs font-bold text-neutral-100">Curves</h1>
                        <ol class="space-y-1">
                            {editor.db.find(visual.SpaceInstance).map(solid =>
                                <li class="flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700">
                                    <plasticity-icon name="curve" class="text-accent-500"></plasticity-icon>
                                    <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">Curve {solid.view.simpleName}</div>
                                    <button class="p-1 rounded group text-neutral-300 group-hover:text-neutral-100 hover:bg-neutral-500">
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