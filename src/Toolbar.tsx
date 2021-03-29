import { render } from 'preact';
import { Editor } from './Editor';
import { SphereCommand, CircleCommand, CylinderCommand, LineCommand, RectCommand, BoxCommand, MoveCommand, UnionCommand } from './commands/Command';

export default (editor: Editor) => {
    class Toolbar extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            const addLine = (e: Event) => {
                editor.execute(new LineCommand(editor));
            };
            const addCircle = (e: Event) => {
                editor.execute(new CircleCommand(editor));
            };
            const addRect = (e: Event) => {
                editor.execute(new RectCommand(editor));
            };
            const addSphere = (e: Event) => {
                editor.execute(new SphereCommand(editor));
            };
            const addCylinder = (e: Event) => {
                editor.execute(new CylinderCommand(editor));
            };
            const addBox = (e: Event) => {
                editor.execute(new BoxCommand(editor));
            };
            const move = (e: Event) => {
                editor.execute(new MoveCommand(editor));
            };
            const union = (e: Event) => {
                editor.execute(new UnionCommand(editor));
            };
            const result = (
                <>
                    <button icon="icons/LineIcon.png" name="circle" onClick={addLine}>Add Line</button>
                    <button icon="icons/CircleIcon.png" name="circle" onClick={addCircle}>Add Circle</button>
                    <button icon="icons/RectIcon.png" name="rectangle" onClick={addRect}>Add Rectangle</button>
                    <br />
                    <button icon="icons/SphereIcon.png" name="sphere" onClick={addSphere}>Add Sphere</button>
                    <button icon="icons/CylinderIcon.png" name="cylinder" onClick={addCylinder}>Add Cylinder</button>
                    <button icon="icons/BoxIcon.png" name="cylinder" onClick={addBox}>Add Box</button>
                    <br />
                    <button icon="icons/MoveIcon.png" name="move" onClick={move}>Move</button>
                    <br />
                    <button icon="icons/UnionIcon.png" name="union" onClick={union}>Union</button>
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