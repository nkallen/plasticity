import { CompositeDisposable, Disposable } from "event-kit";
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import { EditorSignals } from '../editor/EditorSignals';
import { CancellablePromise } from "../util/CancellablePromise";
import { Helpers } from "../util/Helpers";

/**
 * This class is like a gizmo but it's really just for handling keyboard input.
 */

export interface EditorLike {
    helpers: Helpers,
    viewports: Iterable<Viewport>,
    signals: EditorSignals,
    registry: CommandRegistry,
}

export abstract class AbstractCommandKeyboardInput<CB> {
    constructor(
        protected readonly title: string,
        protected readonly editor: EditorLike,
        protected readonly commands: string[]
    ) { }

    execute(cb: CB) {
        return new CancellablePromise<void>((resolve, reject) => {
            const disposables = new CompositeDisposable();

            for (const viewport of this.editor.viewports) {
                for (const commandName of this.commands) {
                    const d = this.editor.registry.addOne(
                        viewport.domElement,
                        commandName,
                        (e: Event) => {
                            e.stopPropagation();
                            e.preventDefault();
                            this.resolve(cb, commandName, reject);
                        });
                    disposables.add(d);
                }
            }
            this.editor.signals.keybindingsRegistered.dispatch(this.commands);
            disposables.add(new Disposable(() => this.editor.signals.keybindingsCleared.dispatch(this.commands)));

            return { dispose: () => disposables.dispose(), finish: resolve };
        });
    }

    protected abstract resolve(cb: CB, command: string, reject: (reason?: any) => void): void;
}

type Callback = ((s: string) => void) | ((s: string) => Promise<void>);

export class CommandKeyboardInput extends AbstractCommandKeyboardInput<Callback> {
    protected resolve(cb: Callback, command: string, reject: (reason?: any) => void) {
        const components = command.split(':')
        const result = cb(components[components.length - 1]);
        if (result instanceof Promise) {
            result.then(() => { }, reject);
        }
    }
}