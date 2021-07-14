import { CompositeDisposable, Disposable } from "event-kit";
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import { EditorSignals } from '../Editor';
import { Cancel, CancellablePromise } from "../util/Cancellable";
import { Helpers } from "../util/Helpers";

/**
 * This class is like a gizmo but it's really just for handling keyboard input.
 */

export interface EditorLike {
    helpers: Helpers,
    viewports: Viewport[],
    signals: EditorSignals,
    registry: CommandRegistry,
}

export abstract class CommandKeyboardInput<CB> {
    constructor(
        protected readonly title: string,
        protected readonly editor: EditorLike,
        protected readonly commands: string[]
    ) { }

    execute(cb: CB) {
        const disposables = new CompositeDisposable();

        for (const viewport of this.editor.viewports) {
            viewport.setAttribute("gizmo", this.title);
            disposables.add(new Disposable(() => viewport.removeAttribute("gizmo")));

            for (const command of this.commands) {

                const d = this.editor.registry.addOne(
                    viewport.renderer.domElement,
                    command,
                    () => this.resolve(cb, command));
                disposables.add(d);
            }
        }
        this.editor.signals.keybindingsRegistered.dispatch(this.commands);
        disposables.add(new Disposable(() => this.editor.signals.keybindingsCleared.dispatch(this.commands)));

        return new CancellablePromise<void>((resolve, reject) => {
            const cancel = () => {
                disposables.dispose();
                reject(Cancel);
            }
            const finish = () => {
                disposables.dispose();
                resolve();
            }
            return { cancel, finish };
        });
    }

    abstract resolve(cb: CB, command: string): void;
}