import { render } from 'preact';
import * as THREE from "three";
import { Editor } from '../../editor/Editor';
import { SelectionMode } from '../../selection/ChangeSelectionExecutor';
import edge from './img/edge.svg';
import face from './img/face.svg';
import grid from './img/ortho.svg';
import point from './img/point.svg';
import perspective from './img/perspective.svg';
import solid from './img/solid.svg';
import xray from './img/xray.svg';
import { ViewportElement } from './Viewport';

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const _X = new THREE.Vector3(-1, 0, 0);
const _Y = new THREE.Vector3(0, -1, 0);
const _Z = new THREE.Vector3(0, 0, -1);

export default (editor: Editor) => {
    class Header extends HTMLElement {
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
            const element = this.parentNode as unknown as ViewportElement
            return element.model;
        }

        get description() {
            const { viewport } = this;
            if (!viewport.isOrthoMode) return "";
            const n = viewport.constructionPlane.n;
            if (n.equals(X)) {
                return "Right";
            } else if (n.equals(_Y)) {
                return "Front";
            } else if (n.equals(Z)) {
                return "Top";
            } else if (n.equals(_X)) {
                return "Left";
            } else if (n.equals(Y)) {
                return "Back";
            } else if (n.equals(_Z)) {
                return "Bottom";
            }
        }

        render() {
            const { description } = this;
            const result = (
                <>
                    <div class="absolute top-2 left-1/2 w-full -translate-x-1/2">
                        <ol class="flex absolute left-2 flex-row space-x-0.5">
                            <li>
                                <input type="checkbox" class="hidden absolute peer" id="control-point" checked={editor.selection.mode.has(SelectionMode.ControlPoint)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.ControlPoint)}
                                />
                                <label for="control-point" class="block p-2 rounded-l shadow-lg transform cursor-pointer bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 hover:bg-accent-600">
                                    <svg width="24" height="24" class="w-4 h-4 stroke-2 text-neutral-200 group-hover:text-neutral-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17 20C17 21.1046 17.8954 22 19 22C20.1046 22 21 21.1046 21 20C21 18.8954 20.1046 18 19 18C17.8954 18 17 18.8954 17 20ZM17 20H15" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M7 4C7 5.10457 6.10457 6 5 6C3.89543 6 3 5.10457 3 4C3 2.89543 3.89543 2 5 2C6.10457 2 7 2.89543 7 4ZM7 4L9 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M14 4L12 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M12 20H10" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M3 20C11 20 13 4 21 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </label>
                            </li>

                            <li>
                                <input type="checkbox" class="hidden absolute peer" id="edge" checked={editor.selection.mode.has(SelectionMode.CurveEdge)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.CurveEdge, SelectionMode.Curve)}
                                />
                                <label for="edge" class="block p-2 shadow-lg transform cursor-pointer bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 hover:bg-accent-600">
                                    <svg width="24" height="24" class="w-4 h-4 stroke-2 text-neutral-200 group-hover:text-neutral-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 20L21 4" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </label>
                            </li>

                            <li>
                                <input type="checkbox" class="hidden absolute peer" id="face" checked={editor.selection.mode.has(SelectionMode.Face)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.Face)}
                                />
                                <label for="face" class="block p-2 shadow-lg transform cursor-pointer bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 hover:bg-accent-600">
                                    <svg width="24" height="24" class="w-4 h-4 stroke-2 text-neutral-200 group-hover:text-neutral-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M21 3.6V20.4C21 20.7314 20.7314 21 20.4 21H3.6C3.26863 21 3 20.7314 3 20.4V3.6C3 3.26863 3.26863 3 3.6 3H20.4C20.7314 3 21 3.26863 21 3.6Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </label>
                            </li>

                            <li>
                                <input type="checkbox" class="hidden absolute peer" id="solid" checked={editor.selection.mode.has(SelectionMode.Solid)}
                                    onClick={e => editor.selection.mode.set(SelectionMode.Solid)}
                                />
                                <label for="solid" class="block p-2 rounded-r shadow-lg transform cursor-pointer bg-accent-800 peer-checked:bg-accent-600 peer-checked:hover:bg-accent-700 hover:bg-accent-600">
                                    <svg width="24" height="24" class="w-4 h-4 stroke-2 text-neutral-200 group-hover:text-neutral-100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M2.6954 7.18536L11.6954 11.1854L12.3046 9.81464L3.3046 5.81464L2.6954 7.18536ZM12.75 21.5V10.5H11.25V21.5H12.75ZM12.3046 11.1854L21.3046 7.18536L20.6954 5.81464L11.6954 9.81464L12.3046 11.1854Z" fill="currentColor" />
                                        <path d="M3 17.1101V6.88992C3 6.65281 3.13964 6.43794 3.35632 6.34164L11.7563 2.6083C11.9115 2.53935 12.0885 2.53935 12.2437 2.6083L20.6437 6.34164C20.8604 6.43794 21 6.65281 21 6.88992V17.1101C21 17.3472 20.8604 17.5621 20.6437 17.6584L12.2437 21.3917C12.0885 21.4606 11.9115 21.4606 11.7563 21.3917L3.35632 17.6584C3.13964 17.5621 3 17.3472 3 17.1101Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </label>
                            </li>
                        </ol>
                    </div>
                    {/* <div class="selection">
                        <input type="checkbox" class="btn" id="control-point" checked={editor.selection.mode.has(SelectionMode.ControlPoint)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.ControlPoint)}
                        />
                        <label class="btn" for="control-point">
                            <img src={point}></img>
                            <ispace-tooltip placement="bottom" command="selection:set-control-point">Control-Point select</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="edge" checked={editor.selection.mode.has(SelectionMode.CurveEdge)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.CurveEdge, SelectionMode.Curve)}
                        />
                        <label class="btn" for="edge">
                            <img src={edge}></img>
                            <ispace-tooltip placement="bottom" command="selection:set-edge">Edge select</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="face" checked={editor.selection.mode.has(SelectionMode.Face)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.Face)}
                        />
                        <label class="btn" for="face">
                            <img src={face}></img>
                            <ispace-tooltip placement="bottom" command="selection:set-face">Face select</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="solid" checked={editor.selection.mode.has(SelectionMode.Solid)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.Solid)}
                        />
                        <label class="btn" for="solid">
                            <img src={solid}></img>
                            <ispace-tooltip placement="bottom" command="selection:set-solid">Solid select</ispace-tooltip>
                        </label>
                    </div>
                    <div class="info">
                        {description}
                    </div>
                    <div class="properties">
                        <input type="checkbox" class="btn" id="ortho" checked={this.viewport.camera.isPerspectiveCamera}
                            onClick={e => this.viewport.togglePerspective()}
                        />
                        <label class="btn" for="ortho">
                            <img src={perspective}></img>
                            <ispace-tooltip placement="bottom" command="viewport:toggle-orthographic">Switch the current view from perspective/orthographic</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="xray" checked={this.viewport.isXRay}
                            onClick={e => this.viewport.toggleXRay()}
                        />
                        <label class="btn" for="xray">
                            <img src={xray}></img>
                            <ispace-tooltip placement="bottom" command="viewport:toggle-xray">Toggle X-Ray mode</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="overlays" checked={this.viewport.showOverlays}
                            onClick={e => this.viewport.toggleOverlays()}
                        />
                        <label class="btn" for="overlays">
                            <img src={grid}></img>
                            <ispace-tooltip placement="bottom" command="viewport:toggle-overlays">Toggle overlays</ispace-tooltip>
                        </label>
                    </div> */}
                </>
            );
            render(result, this);
        }
    }

    customElements.define('plasticity-viewport-header', Header);
}
