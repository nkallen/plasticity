import { CompositeDisposable } from 'event-kit';
import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import * as visual from '../../visual_model/VisualModel';
import * as THREE from 'three';

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private readonly disposable = new CompositeDisposable();

        connectedCallback() { this.render() }
        disconnectedCallback() { this.disposable.dispose() }

        render() {
            const layers = visual.Layers;
            const ll = new THREE.Layers();
            render(
                <div class="p-4">
                    <h1 class="mb-4 text-xs font-bold text-neutral-100">Snaps</h1>
                    <ul class="space-y-1">
                        {[layers.Face, layers.Curve, layers.CurveEdge].map(layer => {
                            ll.set(layer);
                            return <li class="flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700" onClick={e => this.onClick(e, layer)}>
                                <plasticity-icon name={`layer-${layers[layer]}`} class="text-accent-500"></plasticity-icon>
                                <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{layers[layer]}</div>
                                <div class="p-1 rounded group text-neutral-300">
                                    <plasticity-icon key={editor.layers.intersectable.test(ll)} name={editor.layers.intersectable.test(ll) ? 'eye' : 'eye-off'}></plasticity-icon>
                                </div>
                            </li>
                        })}
                    </ul>
                </div>, this);
        }

        onClick = (event: MouseEvent, layer: visual.Layers) => {
            editor.layers.intersectable.toggle(layer);
            this.render();
        }
    }
    customElements.define('plasticity-snaps', Anon);
}

