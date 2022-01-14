import { render } from 'preact';
import * as THREE from "three";
import { Editor } from '../../editor/Editor';
import { SelectionMode } from '../../selection/ChangeSelectionExecutor';
import { ViewportElement } from './Viewport';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export default (editor: Editor) => {

    let counter = 0;

    class Header extends HTMLElement {
        private uid = counter++;

        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            this.render();
            this.viewport.changed.add(this.render);
            editor.signals.selectionModeChanged.add(this.render);
        }

        disconnectedCallback() {
            this.viewport.changed.remove(this.render);
            editor.signals.selectionModeChanged.remove(this.render);
        }

        get viewport() {
            const element = this.parentNode as unknown as ViewportElement;
            return element.model;
        }

        get description() {
            const { viewport } = this;
            if (!viewport.isOrthoMode) return "";
            const n = viewport.constructionPlane.n;
            if (n.equals(X)) return "Right";
            else if (n.equals(_Y)) return "Front";
            else if (n.equals(Z)) return "Top";
            else if (n.equals(_X)) return "Left";
            else if (n.equals(Y)) return "Back";
            else if (n.equals(_Z)) return "Bottom";
        }

        render() {
            const { viewport, uid } = this;
            const result = (
                <>
                    <div class="flex absolute top-2 right-2 left-2 z-50 justify-between mr-32">
                        <ol class="flex flex-row space-x-0.5">
                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`control-point_${uid}`} checked={editor.selection.mode.has(SelectionMode.ControlPoint)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.ControlPoint)}
                                />
                                <label for={`control-point_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='control-point'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-control-point">Control-Point select</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`edge_${uid}`} checked={editor.selection.mode.has(SelectionMode.CurveEdge)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.CurveEdge, SelectionMode.Curve)}
                                />
                                <label for={`edge_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='edge'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-edge">Edge select</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`face_${uid}`} checked={editor.selection.mode.has(SelectionMode.Face)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.Face)}
                                />
                                <label for={`face_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='face'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-face">Face select</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`solid_${uid}`} checked={editor.selection.mode.has(SelectionMode.Solid)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.Solid)}
                                />
                                <label for={`solid_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='solid'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="selection:set-solid">Solid select</plasticity-tooltip>
                                </label>
                            </li>
                        </ol>

                        <ol class="flex flex-row space-x-0.5">
                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`ortho_${uid}`} checked={viewport.camera.isPerspectiveCamera}
                                    onClick={e => viewport.togglePerspective()}
                                />
                                <label for={`ortho_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='ortho'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-orthographic">Perspective/Orthographic</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <input type="checkbox" class="hidden absolute peer" id={`xray_${uid}`} checked={viewport.isXRay}
                                    onClick={e => viewport.toggleXRay()}
                                />
                                <label for={`xray_${uid}`} class="block p-2 shadow-lg transform cursor-pointer bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <plasticity-icon name='xray'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-x-ray">Toggle X-Ray mode</plasticity-tooltip>
                                </label>
                            </li>

                            <li class="group">
                                <label for={`overlays_${uid}`} class="block p-2 shadow-lg transform cursor-pointer group-first:rounded-l group-last:rounded-r bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 text-accent-200 hover:text-accent-100 hover:bg-accent-600">
                                    <input type="checkbox" class="hidden absolute peer" id={`overlays_${uid}`} checked={this.viewport.showOverlays}
                                        onClick={e => viewport.toggleOverlays()}
                                    />
                                    <plasticity-icon name='overlays'></plasticity-icon>
                                    <plasticity-tooltip placement="bottom" command="viewport:toggle-overlays">Toggle overlays</plasticity-tooltip>
                                </label>
                            </li>
                        </ol>
                    </div>
                </>
            );
            render(result, this);
        }
    }

    customElements.define('plasticity-viewport-header', Header);
}
