import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { ViewportElement } from './Viewport';
import grid from './img/ortho.svg';
import perspective from './img/perspective.svg';
import xray from './img/xray.svg';
import * as THREE from "three";

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
        }

        disconnectedCallback() {
            this.viewport.changed.remove(this.render);
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
                    <div class="info">
                        {description}
                    </div>
                    <div class="properties">
                        <button type="button" onClick={e => this.viewport.toggleOrtho()} tabIndex={-1}>
                            <img src={perspective}></img>
                            <ispace-tooltip placement="bottom" command="viewport:toggle-orthographic">Switch the current view from perspective/orthographic</ispace-tooltip>
                        </button>
                        <button type="button" onClick={_ => this.viewport.toggleXRay()} tabIndex={-1}>
                            <img src={xray}></img>
                            <ispace-tooltip placement="bottom" command="viewport:toggle-x-ray">Toggle X-ray. Allow selecting through items</ispace-tooltip>
                        </button>
                        <button type="button" onClick={_ => this.viewport.toggleGrid()} tabIndex={-1}>
                            <img src={grid}></img>
                            <ispace-tooltip placement="bottom" command="viewport:toggle-grid">Toggle grid</ispace-tooltip>
                        </button>
                    </div>
                </>
            );
            render(result, this);
        }
    }

    customElements.define('ispace-viewport-header', Header);
}
