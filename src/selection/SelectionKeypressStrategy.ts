import { pointerEvent2keyboardEvent } from "../components/viewport/KeyboardEventManager";
import { ChangeSelectionModifier, ChangeSelectionOption } from "./ChangeSelectionExecutor";
import { command2modifier, command2option, mouseModifierKeys } from "./ViewportSelector";


export class SelectionKeypressStrategy {
    private readonly keystroke2modifier: Record<string, ChangeSelectionModifier>;
    private readonly keystroke2options: Record<string, ChangeSelectionOption>;

    constructor(
        private readonly keymaps: AtomKeymap.KeymapManager,
        keymapSelector?: string
    ) {
        const { keystroke2modifier, keystroke2options } = SelectionKeypressStrategy.getMouseButtons(keymaps, keymapSelector);
        this.keystroke2modifier = keystroke2modifier;
        this.keystroke2options = keystroke2options;
    }

    static getMouseButtons(keymaps: AtomKeymap.KeymapManager, cssSelector = 'viewport-selector') {
        let bindings = keymaps.getKeyBindings();
        bindings = bindings.filter(b => b.selector == cssSelector);
        const repl = bindings.filter(b => b.command == 'selection:replace').sort((a, b) => a.compare(b))[0];
        const add = bindings.filter(b => b.command == 'selection:add').sort((a, b) => a.compare(b))[0];
        const rem = bindings.filter(b => b.command == 'selection:remove').sort((a, b) => a.compare(b))[0];
        const keystroke2modifier: Record<string, ChangeSelectionModifier> = {};
        if (repl !== undefined)
            keystroke2modifier[repl.keystrokes] = command2modifier(repl.command);
        if (add !== undefined)
            keystroke2modifier[add.keystrokes] = command2modifier(add.command);
        if (rem !== undefined)
            keystroke2modifier[rem.keystrokes] = command2modifier(rem.command);

        const ignore = bindings.filter(b => b.command == 'selection:option:ignore-mode').sort((a, b) => a.compare(b))[0];
        const extend = bindings.filter(b => b.command == 'selection:option:extend').sort((a, b) => a.compare(b))[0];
        const keystroke2options: Record<string, ChangeSelectionOption> = {};
        if (ignore !== undefined)
            keystroke2options[ignore.keystrokes] = command2option(ignore.command);
        if (extend !== undefined)
            keystroke2options[extend.keystrokes] = command2option(extend.command);

        return { keystroke2modifier, keystroke2options };
    }

    event2modifier(event?: MouseEvent): ChangeSelectionModifier {
        if (event === undefined)
            return ChangeSelectionModifier.Replace;
        const keyboard = pointerEvent2keyboardEvent(event);
        const keystroke = this.keymaps.keystrokeForKeyboardEvent(keyboard);
        return this.keystroke2modifier[keystroke];
    }

    event2option(event?: MouseEvent): ChangeSelectionOption {
        if (event === undefined)
            return ChangeSelectionOption.None;
        let result = ChangeSelectionOption.None;
        for (const modifierName of mouseModifierKeys) {
            const modifierKey = `${modifierName}Key` as keyof MouseEvent;
            const modified = event[modifierKey] as boolean;
            if (modified) {
                result |= this.keystroke2options[modifierName == 'meta' ? 'cmd' : modifierName];
            }
        }
        return result;
    }
}
