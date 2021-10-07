import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { ViewportElement } from './Viewport';
import grid from './img/ortho.svg';
import perspective from './img/perspective.svg';
import xray from './img/xray.svg';

export default (editor: Editor) => {
    class Header extends HTMLElement {
        constructor() {
            super();
            this.render = this.render.bind(this);
        }

        connectedCallback() {
            this.render();
        }

        disconnectedCallback() {
        }

        get viewport() {
            const element = this.parentNode as unknown as ViewportElement
            return element.model;
        }

        render() {
            const result = (
                <>
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
                </>
            );
            render(result, this);
        }
    }

    customElements.define('ispace-viewport-header', Header);
}
