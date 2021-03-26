import { render } from 'preact';
import { Editor } from './editor';
import { SphereCommand, CircleCommand } from './commands/Command';

export default (editor: Editor) => {
    class Toolbar extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            const addSphere = (e: Event) => {
                editor.execute(new SphereCommand(editor));
            };
            const addCircle = (e: Event) => {
                editor.execute(new CircleCommand(editor));
            };
            const result = (
                <>
                    <button icon="icons/SphereIcon.png" name="sphere" onClick={addSphere}>Add Sphere</button>
                    <button icon="icons/CircleIcon.png" name="circle" onClick={addCircle}>Add Circle</button>
                </>
            );
            render(result, this.shadowRoot!);
        }
    }
    customElements.define('ispace-toolbar', Toolbar);

    class Inspector extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            editor.signals.objectAdded.add(this.update.bind(this));

            this.render("");
        }

        update(object: THREE.Object3D) {
            this.render(object.uuid);
        }

        render(uuid: string) {
            const result = (
                <span>{uuid}</span>
            );
            render(result, this.shadowRoot!);
        }
    }
    customElements.define('ispace-inspector', Inspector);

}