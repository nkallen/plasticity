import CommandRegistry from "../components/atom/CommandRegistry";
import PlanarCurveDatabase from "../editor/ContourManager";
import { EditorSignals } from "../editor/EditorSignals";
import { DatabaseLike } from "../editor/GeometryDatabase";
import { EditorOriginator, History } from "../editor/History";
import { HasSelectedAndHovered } from "../selection/SelectionManager";
import { Cancel } from "../util/Cancellable";
import Command from "./Command";
import { ValidationError } from "./GeometryFactory";
import { SelectionCommandManager } from "./SelectionCommandManager";

export type CancelOrFinish = 'cancel' | 'finish';

export interface EditorLike {
    db: DatabaseLike;
    selectionGizmo: SelectionCommandManager;
    registry: CommandRegistry;
    signals: EditorSignals;
    originator: EditorOriginator;
    history: History;
    selection: HasSelectedAndHovered;
    contours: PlanarCurveDatabase;
}

export class CommandExecutor {
    constructor(private readonly editor: EditorLike) { }

    private active?: Command;
    private next?: Command;

    // Cancel any active commands and "enqueue" another.
    // Ensure commands are executed ATOMICALLY.
    // That is, do not start a new command until the previous is fully completed,
    // including any cancelation cleanup. (await this.execute(next))
    async enqueue(command: Command, cancelOrFinish: CancelOrFinish = 'finish') {
        this.next = command;
        const isActive = !!this.active;
        if (cancelOrFinish === 'cancel') this.cancelActiveCommand();
        else if (cancelOrFinish === 'finish') this.finishActiveCommand();

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
                const command = this.editor.selectionGizmo.commandFor(next);
                if (command !== undefined) await this.enqueue(command);
            } catch (e) {
                if (e !== Cancel) {
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
                command.finish();
            })
            if (selectionChanged) signals.selectionChanged.dispatch({ selection: selection.selected });
            history.add("Command", state);
            signals.commandFinishedSuccessfully.dispatch(command);
        } catch (e) {
            command.cancel();
            throw e;
        } finally {
            document.body.removeAttribute("command");
            disposable.dispose();
            db.clearTemporaryObjects();
            signals.commandEnded.dispatch(command);
        }
    }

    cancelActiveCommand() {
        const active = this.active;
        if (active) active.cancel();
    }

    private finishActiveCommand() {
        const active = this.active;
        if (active) active.finish();
    }

    async enqueueDefaultCommand() {
        const command = this.editor.selectionGizmo.commandFor();
        if (command) await this.enqueue(command);
    }
}