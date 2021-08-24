import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import * as THREE from "three";

type SnapInfo = { position: THREE.Vector3, names: string[] };

export default (editor: Editor) => {
    class SnapOverlay extends HTMLElement {
        private info?: SnapInfo;

        constructor() {
            super();
            this.add = this.add.bind(this);
        }

        connectedCallback() {
            editor.signals.snapped.add(this.add);
            this.render();
        }

        disconnectedCallback() {
            editor.signals.snapped.remove(this.add);
        }

        render() {
            const { info } = this;
            if (info === undefined || info.names.length === 0) {
                render(<></>, this);
            } else {
                const { position, names } = info;
                const screen = new THREE.Vector2(position.x, position.y);
                const normalized = new THREE.Vector2();
                normalized2screen(screen, normalized);
                render(<div style={`left: ${normalized.x * 100}%; top: ${normalized.y * 100}%`}>{names!.join(',')}</div>, this);
            }
        }

        add(info?: SnapInfo) {
            if (this.info === undefined) {
                if (info === undefined) return;
                this.info = info;
                this.render();
            } else {
                if (info === undefined) {
                    this.info = undefined;
                    this.render();
                } else {
                    const { position } = info;
                    if (!position.equals(this.info.position)) {
                        this.info = info;
                        this.render();
                    }
                }
            }
        }
    }
    customElements.define('ispace-snap-overlay', SnapOverlay);
}

function normalized2screen(from: THREE.Vector2, to: THREE.Vector2) {
    to.set(from.x / 2 + 0.5, - from.y / 2 + 0.5);
}
