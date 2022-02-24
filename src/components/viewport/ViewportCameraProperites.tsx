import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { ViewportElement } from './Viewport';

export default (editor: Editor) => {
    class ViewportCameraProperties extends HTMLElement {
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

        render() {
            const { viewport, viewport: { constructionPlane } } = this;
            const result = <> hi </>;
            render(result, this);
        }
    }

    customElements.define('plasticity-viewport-camera-properties', ViewportCameraProperties);
}
