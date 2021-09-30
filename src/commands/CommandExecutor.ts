import CommandRegistry from "../components/atom/CommandRegistry";
import PlanarCurveDatabase from "../editor/ContourManager";
import { EditorSignals } from "../editor/EditorSignals";
import { DatabaseLike } from "../editor/GeometryDatabase";
import { EditorOriginator, History } from "../editor/History";
import { HasSelectedAndHovered } from "../selection/SelectionManager";
import { Cancel, Finish, Interrupt } from "../util/Cancellable";
import Command from "./Command";
import { ValidationError } from "./GeometryFactory";
import { SelectionCommandManager } from "./SelectionCommandManager";
import { Viewport } from "../components/viewport/Viewport";

export interface EditorLike {
    db: DatabaseLike;
    selectionGizmo: SelectionCommandManager;
    registry: CommandRegistry;
    signals: EditorSignals;
    originator: EditorOriginator;
    history: History;
    selection: HasSelectedAndHovered;
    contours: PlanarCurveDatabase;
    viewports: ReadonlyArray<Viewport>;
}

export class CommandExecutor {
    constructor(private readonly editor: EditorLike) { }

    private active?: Command;
    private next?: Command;

    // (Optionally) interrupt any active commands and "enqueue" another.
    // Ensure commands are executed ATOMICALLY.
    // That is, do not start a new command until the previous is fully completed,
    // including any cancelation cleanup. (await this.execute(next))
    async enqueue(command: Command, interrupt = true) {
        this.next = command;
        const isActive = !!this.active;
        if (interrupt) this.active?.interrupt();

        if (!isActive) await this.dequeue();
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
                    if (command !== undefined) await this.enqueue(command);
                }
            } catch (e) {
                if (e !== Cancel && e !== Finish && e !== Interrupt) {
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
        if (command) await this.enqueue(command);
    }

    debug() {
        console.group("Debug")
        console.info("Active: ", this.active);
        console.info("Command: ", this.next);
        console.groupEnd();
    }
}