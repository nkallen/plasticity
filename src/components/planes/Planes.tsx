import { CompositeDisposable, Disposable } from 'event-kit';
import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { ConstructionPlane, ConstructionPlaneSnap, ScreenSpaceConstructionPlaneSnap } from "../../editor/snaps/ConstructionPlaneSnap";

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private readonly disposable = new CompositeDisposable();

        constructor() {
            super();
            editor.signals.temporaryConstructionPlaneAdded.add(this.render);
            editor.signals.constructionPlanesChanged.add(this.render);
            this.disposable.add(new Disposable(() => {
                editor.signals.temporaryConstructionPlaneAdded.remove(this.render);
                editor.signals.constructionPlanesChanged.remove(this.render);
            }))
        }

        connectedCallback() { this.render() }
        disconnectedCallback() { this.disposable.dispose() }

        render = (temp?: ConstructionPlane) => {
            render(
                <div class="p-4">
                    <ul class="space-y-1">
                        {[...editor.planes.all].map(plane =>
                            <li
                                class="flex justify-between items-center py-1 px-2 space-x-2 rounded group hover:bg-neutral-700"
                                onClick={e => this.onClick(e, plane)}
                                onDblClick={e => this.onDblClick(e, plane)}
                            >
                                <plasticity-tooltip placement="left">Set plane (double-click to align camera)</plasticity-tooltip>
                                <plasticity-icon name="offset-face" class="text-accent-500"></plasticity-icon>
                                <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{plane.name}</div>
                            </li>
                        )}
                    </ul>
                </div>, this);
        }

        onClick = (event: MouseEvent, plane: ConstructionPlaneSnap) => {
            if (editor.activeViewport !== undefined) editor.activeViewport.constructionPlane = plane;
            this.render();
        }

        onDblClick = (event: MouseEvent, plane: ConstructionPlaneSnap) => {
            editor.activeViewport?.navigate();
            this.render();
        }
    }
    customElements.define('plasticity-planes', Anon);
}

