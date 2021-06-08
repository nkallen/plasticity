import { EditorSignals } from "../Editor";
import CommandRegistry from "../components/atom/CommandRegistry";
import Command from "./Command";
import { SelectionCommandManager } from "./SelectionCommandManager";
import { EditorOriginator, History } from "../History";
import { Cancel } from "../util/Cancellable";
import { HasSelection } from "../selection/SelectionManager";

export class CommandExecutor {
    constructor(
        private readonly selectionGizmo: SelectionCommandManager,
        private readonly registry: CommandRegistry,
        private readonly signals: EditorSignals,
        private readonly originator: EditorOriginator,
        private readonly history: History,
        private readonly selection: HasSelection,
    ) { }

    private active?: Command;
    private next?: Command;

    // Cancel any active commands and "enqueue" another.
    // Ensure commands are executed ATOMICALLY.
    // Do not start a new command until the previous is fully completed,
    // including any cancelation cleanup. (await this.execute(next))
    async enqueue(command: Command) {
        this.next = command;
        if (!this.cancelActiveCommand())
            await this.dequeue();
    }

    private async dequeue() {
        if (!this.next) throw new Error("Invalid precondition");

        let next!: Command;
        while (this.next) {
            next = this.next;
            if (this.active) throw new Error("invalid precondition");
            this.active = next;
            this.next = undefined;
            try { await this.execute(next) } 
            finally {
                this.active = undefined;
            }
        }

        const command = this.selectionGizmo.commandFor(next);
        if (command) await this.enqueue(command);
    }

    private async execute(command: Command) {
        const disposable = this.registry.add('ispace-viewport', {
            'command:finish': () => command.finish(),
            'command:abort': () => command.cancel(),
        });
        const state = this.originator.saveToMemento(new Map());
        try {
            let selectionChanged = false;
            this.signals.objectSelected.addOnce(() => selectionChanged = true);
            this.signals.objectDeselected.addOnce(() => selectionChanged = true);
            await command.execute();
            if (selectionChanged) this.signals.selectionChanged.dispatch({ selection: this.selection });
            this.history.add("Command", state);
        } catch (e) {
            if (e !== Cancel) throw e;
        } finally {
            disposable.dispose();
        }
    }

    cancelActiveCommand(): boolean {
        const active = this.active;
        if (active) active.cancel();
        return !!active;
    }

    async enqueueDefaultCommand() {
        const command = this.selectionGizmo.commandFor();
        if (command) await this.enqueue(command);
    }
}