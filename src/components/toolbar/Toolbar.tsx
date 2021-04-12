import { render } from 'preact';
import Command, * as cmd from '../../commands/Command';
import { Editor } from '../../Editor';
import { GConstructor } from '../../Util';
import './translate.svg';
import './rotate.svg';
import './scale.svg';
import toolbar2 from './toolbar.less';

export default (editor: Editor) => {
    class CommandButton extends HTMLButtonElement {
        constructor() {
            super();
            type CommandName = keyof typeof cmd;
            const name = this.getAttribute('name');
            const CommandName = name + 'Command' as CommandName;
            const klass = cmd[CommandName] as GConstructor<Command>;
            if (klass == null) throw `${name} is invalid`;
            this.addEventListener('click', e => editor.execute(new klass(editor)));
        }
    }
    customElements.define('ispace-command', CommandButton, { extends: 'button' });

    class Toolbar2 extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });

            editor.signals.objectSelected.add(this.update.bind(this));
            editor.signals.objectDeselected.add(this.update.bind(this));

            this.render();
        }

        update(object: THREE.Object3D) {
            this.render();
        }

        render() {
            const result = (
                <>
                    <style type="text/css">{toolbar2.toString()}</style>
                    <button><img title="Translate" src="img/translate.svg"></img></button>
                    <button><img title="Rotate" src="img/rotate.svg"></img></button>
                    <button><img title="Scale" src="img/scale.svg"></img></button>
                </>
            );
            render(result, this.shadowRoot!);
        }
    }
    customElements.define('ispace-toolbar2', Toolbar2);

}