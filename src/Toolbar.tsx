import { render } from 'preact';
import { Editor } from './Editor';
import Command, * as cmd from './commands/Command';
import { GConstructor } from './Util';

export default (editor: Editor) => {
    class CommandButton extends HTMLButtonElement {
        constructor() {
            super();
            type CommandName = keyof typeof cmd;
            const name = this.getAttribute('name');
            const CommandName = name + 'Command' as CommandName;
            const klass = cmd[CommandName] as GConstructor<Command>;
            this.addEventListener('click', e => editor.execute(new klass(editor)) );
        }
    }
    customElements.define('ispace-command', CommandButton, { extends: 'button'});

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