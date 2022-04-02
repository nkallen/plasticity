import { render } from 'preact';
import * as THREE from 'three';
import { PointPickerModel } from "../../command/point-picker/PointPickerModel";
import { Editor } from '../../editor/Editor';
import { Snap } from "../../editor/snaps/Snap";
import { SnapType } from '../../editor/snaps/SnapManager';
import * as visual from '../../visual_model/VisualModel';

export default (editor: Editor) => {
    class Anon extends HTMLElement {
        private snaps = new Set<Snap>();
        private pointPicker?: PointPickerModel;

        connectedCallback() {
            editor.signals.snapsAdded.add(this.add);
            editor.signals.snapsCleared.add(this.delete);
            this.render();
        }

        disconnectedCallback() {
            editor.signals.snapsAdded.remove(this.add);
            editor.signals.snapsCleared.remove(this.remove);
        }

        add = (info: { snaps: Snap[], pointPicker: PointPickerModel }) => {
            for (const snap of info.snaps) this.snaps.add(snap);
            this.pointPicker = info.pointPicker;
            this.render();
        }

        delete = (snaps: Snap[]) => {
            this.snaps.clear();
            this.pointPicker = undefined;
            this.render();
        }

        render() {
            const layers = visual.Layers;
            const ll = new THREE.Layers();
            render(
                <div class="p-4">
                    <h1 class="flex justify-between items-center py-0.5 px-2 mb-4 space-x-2 text-xs font-bold rounded text-neutral-100 hover:bg-neutral-700">
                        <div>Snaps</div>
                        <div class="flex">
                            <div class="p-1 rounded group text-neutral-300" onClick={e => this.toggleAllSnaps(e)}>
                                <plasticity-icon key={editor.snaps.enabled} name={editor.snaps.enabled ? 'eye' : 'eye-off'}></plasticity-icon>
                            </div>
                            <div class="p-1 rounded group text-neutral-300" onClick={e => this.toggleGrid(e)}>
                                <plasticity-icon key={editor.snaps.snapToGrid} name={editor.snaps.snapToGrid ? 'lock' : 'no-lock'}></plasticity-icon>
                            </div>
                        </div>
                    </h1>
                    <ul class="space-y-1">
                        {[layers.Face, layers.Curve, layers.CurveEdge].map(layer => {
                            ll.set(layer);
                            return <li class="flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700" onClick={e => this.toggleLayer(e, layer)}>
                                <plasticity-icon name={`layer-${layers[layer]}`} class="text-accent-500"></plasticity-icon>
                                <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{layers[layer]}</div>
                                <div class="p-1 rounded group text-neutral-300">
                                    <plasticity-icon key={editor.snaps.layers.test(ll)} name={editor.snaps.layers.test(ll) ? 'eye' : 'eye-off'}></plasticity-icon>
                                </div>
                            </li>
                        })}
                        {[SnapType.Basic, SnapType.Crosses].map(snapType => {
                            return <li class="flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700" onClick={e => this.toggleSnapType(e, snapType)}>
                                <plasticity-icon name={`snap-type-${SnapType[snapType]}`} class="text-accent-500"></plasticity-icon>
                                <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{SnapType[snapType]}</div>
                                <div class="p-1 rounded group text-neutral-300">
                                    <plasticity-icon key={(editor.snaps.options & snapType) === snapType} name={(editor.snaps.options & snapType) === snapType ? 'eye' : 'eye-off'}></plasticity-icon>
                                </div>
                            </li>
                        })}
                        {[...this.snaps].map(snap => {
                            if (snap.name === undefined) return;
                            return <li key={snap.name} class="flex justify-between items-center py-0.5 px-2 space-x-2 rounded group hover:bg-neutral-700" onClick={e => this.toggleSnap(e, snap)}>
                                <plasticity-icon name={`snap-${snap.name}`} class="text-accent-500"></plasticity-icon>
                                <div class="flex-grow text-xs text-neutral-300 group-hover:text-neutral-100">{snap.name}</div>
                                <div class="p-1 rounded group text-neutral-300">
                                    <plasticity-icon key={this.pointPicker!.isEnabled(snap)} name={this.pointPicker!.isEnabled(snap) ? 'eye' : 'eye-off'}></plasticity-icon>
                                </div>
                            </li>
                        })}
                    </ul>
                </div>, this);
        }

        toggleLayer = (event: MouseEvent, layer: visual.Layers) => {
            editor.snaps.layers.toggle(layer);
            this.render();
        }

        toggleSnapType = (event: MouseEvent, snapType: SnapType) => {
            editor.snaps.options ^= snapType;
            this.render();
        }

        toggleAllSnaps = (event: MouseEvent) => {
            editor.snaps.enabled = !editor.snaps.enabled;
            this.render();
        }

        toggleGrid = (event: MouseEvent) => {
            editor.snaps.snapToGrid = !editor.snaps.snapToGrid;
            this.render();
        }

        toggleSnap = (event: MouseEvent, snap: Snap) => {
            this.pointPicker!.toggle(snap);
            this.render();
        }
    }
    customElements.define('plasticity-snaps', Anon);
}

