import { CompositeDisposable } from "event-kit";
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import ContourManager from "../editor/curves/ContourManager";
import { EditorSignals } from "../editor/EditorSignals";
import { DatabaseLike } from "../editor/GeometryDatabase";
import { EditorOriginator, History } from "../editor/History";
import { HasSelectedAndHovered } from "../selection/SelectionManager";
import { Cancel, Finish, Interrupt } from "../util/Cancellable";
import { GConstructor } from "../util/Util";
import Command from "./Command";
import { NoOpError, ValidationError } from "./GeometryFactory";
import { SelectionCommandManager } from "./SelectionCommandManager";

export interface EditorLike {
    db: DatabaseLike;
    selectionGizmo: SelectionCommandManager;
    registry: CommandRegistry;
    signals: EditorSignals;
    originator: EditorOriginator;
    history: History;
    selection: HasSelectedAndHovered;
    contours: ContourManager;
    viewports: ReadonlyArray<Viewport>;
}

export class CommandExecutor {
    constructor(private readonly editor: EditorLike) { }

    private active?: Command;
    private next?: Command;
    private lastCommand?: GConstructor<Command>;

    // (Optionally) interrupt any active commands and "enqueue" another.
    // Ensure commands are executed ATOMICALLY.
    // That is, do not start a new command until the previous is fully completed,
    // including any cancelation cleanup. (await this.execute(next))
    async enqueue(command: Command, interrupt = true, remember = true) {
        if (remember && command.remember) this.lastCommand = command.constructor as GConstructor<Command>;

        this.next = command;
        const isActive = !!this.active;
        if (interrupt) this.active?.interrupt();

        if (!isActive) await this.dequeue();
    }

    repeatLastCommand(): Promise<void> {
        if (this.lastCommand === undefined) return Promise.resolve();
        return this.enqueue(new this.lastCommand(this.editor), true, false);
    }

    private async dequeue() {
        let next!: Command;
        while (this.next) {
            next = this.next;
            this.active = next;
            this.next = undefined;
            try {
                await this.execute(next);
                if (this.next === undefined) {
                    const command = this.editor.selectionGizmo.commandFor(next);
                    if (command !== undefined) await this.enqueue(command, false, false);
                }
            } catch (e) {
                if (e !== Cancel && e !== Finish && e !== Interrupt && !(e instanceof NoOpError)) {
                    if (e instanceof ValidationError) console.warn(`${next.title}: ${e.message}`);
                    else console.warn(e);
                }
            } finally { delete this.active }
        }
    }

    private async execute(command: Command) {
        const { signals, registry, originator, history, selection, contours, db } = this.editor;
        signals.commandStarted.dispatch(command);
        const disposable = registry.add('ispace-viewport', {
            'command:finish': () => command.finish(),
            'command:abort': () => command.cancel(),
        });
        const state = originator.saveToMemento();
        document.body.setAttribute("command", command.identifier);
        try {
            let selectionChanged = false;
            signals.objectSelected.addOnce(() => selectionChanged = true);
            signals.objectDeselected.addOnce(() => selectionChanged = true);
            await contours.transaction(async () => {
                await command.execute();
                command.finish(); // FIXME I'm not sure this is necessary
            })
            if (selectionChanged) signals.selectionChanged.dispatch({ selection: selection.selected });
            if (command.shouldAddToHistory(selectionChanged)) history.add("Command", state);
            signals.commandFinishedSuccessfully.dispatch(command);
        } catch (e) {
            command.cancel();
            throw e;
        } finally {
            document.body.removeAttribute("command");
            disposable.dispose();
            db.clearTemporaryObjects();
            signals.commandEnded.dispatch(command);
            originator.validate();
            console.groupCollapsed(command.title);
            originator.debug();
            for (const viewport of this.editor.viewports) {
                viewport.validate();
            }
            console.groupEnd();
        }
    }

    cancelActiveCommand() {
        const active = this.active;
        if (active) active.cancel();
    }

    async enqueueDefaultCommand() {
        const command = this.editor.selectionGizmo.commandFor();
        if (command) await this.enqueue(command, false, false);
    }

    debug() {
        console.group("Debug")
        console.info("Active: ", this.active);
        console.info("Command: ", this.next);
        console.groupEnd();
    }
}