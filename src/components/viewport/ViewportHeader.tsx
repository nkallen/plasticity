import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { ViewportElement } from './Viewport';
import grid from './img/ortho.svg';
import perspective from './img/perspective.svg';
import xray from './img/xray.svg';
import * as THREE from "three";
import { SelectionMode } from '../../selection/ChangeSelectionExecutor';

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
            if (!viewport.isOrtho) return "";
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
                    <div class="selection">
                        <input type="checkbox" class="btn" id="control-point" checked={editor.selection.mode.has(SelectionMode.ControlPoint)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.ControlPoint)}
                        />
                        <label class="btn" for="control-point">
                            <img src={perspective}></img>
                            <ispace-tooltip placement="bottom" command="selection:toggle-control-point">Control-Point select</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="edge" checked={editor.selection.mode.has(SelectionMode.CurveEdge)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.CurveEdge, SelectionMode.Curve)}
                        />
                        <label class="btn" for="edge">
                            <img src={perspective}></img>
                            <ispace-tooltip placement="bottom" command="selection:toggle-edge">Edge select</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="face" checked={editor.selection.mode.has(SelectionMode.Face)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.Face)}
                        />
                        <label class="btn" for="face">
                            <img src={perspective}></img>
                            <ispace-tooltip placement="bottom" command="selection:toggle-face">Face select</ispace-tooltip>
                        </label>
                        <input type="checkbox" class="btn" id="solid" checked={editor.selection.mode.has(SelectionMode.Solid)}
                            onClick={e => editor.selection.mode.toggle(SelectionMode.Solid)}
                        />
                        <label class="btn" for="solid">
                            <img src={perspective}></img>
                            <ispace-tooltip placement="bottom" command="selection:toggle-solid">Solid select</ispace-tooltip>
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
                    </div>
                </>
            );
            render(result, this);
        }
    }

    customElements.define('ispace-viewport-header', Header);
}
