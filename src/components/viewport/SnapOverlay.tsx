import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import * as THREE from "three";

export default (editor: Editor) => {
    class SnapOverlay extends HTMLElement {
        private info?: { position: Readonly<THREE.Vector3>, names: readonly string[] };

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

        private readonly normalized = new THREE.Vector2();
        render() {
            const { info } = this;
            let result;
            if (info === undefined || info.names.length === 0) {
                result = <></>;
            } else {
                const { position, names } = info;
                const { normalized } = this;
                normalized2screen(position, normalized);
                result = <div class="absolute py-2 px-1 ml-5 -mt-5 text-sm text-black rounded border opacity-90 bg-neutral-500 border-neutral-600" style={`left: ${normalized.x * 100}%; top: ${normalized.y * 100}%`}>{names!.join(',')}</div>;
            }
            render(<div class="absolute top-0 left-0 w-full h-full pointer-events-none">{result}</div>, this);
        }

        private add(info?: { position: Readonly<THREE.Vector3>, names: readonly string[] }) {
            this.info = info;
            this.render();
        }
    }
    customElements.define('plasticity-snap-overlay', SnapOverlay);
}

function normalized2screen(from: THREE.Vector3, to: THREE.Vector2) {
    to.set(from.x / 2 + 0.5, - from.y / 2 + 0.5);
}
