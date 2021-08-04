import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { ViewportElement } from './Viewport';

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
                    <button type="button" onClick={e => this.viewport.foo()}>
                        XY-Plane
                        <ispace-tooltip placement="bottom" command="change-construction-plane">Change construction plane</ispace-tooltip>
                    </button>
                </>
            );
            render(result, this);
        }
    }

    customElements.define('ispace-viewport-header', Header);
}
