import { render } from 'preact';
import { Editor } from '../../editor/Editor';
import { humanizeKeystrokes } from '../atom/tooltip-manager';
import { keybindings } from '../toolbar/icons';

export default (editor: Editor) => {
    class Keybindings extends HTMLElement {
        private commands = new Set<string>();

        constructor() {
            super();
            this.add = this.add.bind(this);
            this.delete = this.delete.bind(this);
        }

        connectedCallback() {
            editor.signals.keybindingsRegistered.add(this.add);
            editor.signals.keybindingsCleared.add(this.delete);
        }

        render() {
            const { commands } = this;
            const keymaps = editor.keymaps;
            const result = <ul class="absolute bottom-3 right-24 w-52 bg-transparent text-neutral-100">
                {[...commands].map(command => {
                    const bindings = keymaps.findKeyBindings({ command });
                    if (bindings.length == 0) {
                        console.warn("Command missing from keymap (default-keymap.ts):", command);
                        return;
                    }
                    const keystroke = humanizeKeystrokes(bindings[0].keystrokes);
                    const desc = keybindings.get(command);
                    if (desc === undefined) console.error("Description missing from (icons.ts)", command);

                    return <li class="flex items-center m-1 text-xs">
                        <label class="flex justify-center items-center p-1 mr-1 w-6 h-6 font-bold border text-neutral-100 border-neutral-200">{keystroke}</label>
                        <div>{desc}</div>
                    </li>
                })}
            </ul>;
            render(result, this);
        }

        add(commands: string[]) {
            for (const command of commands) this.commands.add(command);
            this.render();
        }

        delete(commands: string[]) {
            for (const command of commands) this.commands.delete(command);
            this.render();
        }

        disconnectedCallback() {
            editor.signals.keybindingsRegistered.remove(this.add);
            editor.signals.keybindingsCleared.remove(this.add);
        }
    }
    customElements.define('plasticity-keybindings', Keybindings);
};