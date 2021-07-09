import { EditorSignals } from "../Editor";
import CommandRegistry from "../components/atom/CommandRegistry";
import Command from "./Command";
import { SelectionCommandManager } from "./SelectionCommandManager";
import { EditorOriginator, History } from "../History";
import { Cancel } from "../util/Cancellable";
import { HasSelection } from "../selection/SelectionManager";

export type CancelOrFinish = 'cancel' | 'finish';

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
    // That is, do not start a new command until the previous is fully completed,
    // including any cancelation cleanup. (await this.execute(next))
    async enqueue(command: Command, cancelOrFinish: CancelOrFinish = 'cancel') {
        this.next = command;
        const isActive = !!this.active;
        if (cancelOrFinish === 'cancel') this.cancelActiveCommand();
        else if (cancelOrFinish === 'finish') this.finishActiveCommand();

        if (!isActive) await this.dequeue();
    }

    private async dequeue() {
        if (!this.next) throw new Error("Invalid precondition");

        let next!: Command;
        const es =[];
        while (this.next) {
            next = this.next;
            if (this.active) throw new Error("invalid precondition");
            this.active = next;
            this.next = undefined;
            try { await this.execute(next) }
            catch (_e) { es.push(_e) }
            finally { this.active = undefined; }
        }

        const command = this.selectionGizmo.commandFor(next);
        if (command) await this.enqueue(command);

        for (const e of es) { console.error(e) }
    }

    private async execute(command: Command) {
        console.log(command);
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
            command.cancel();
        } finally {
            disposable.dispose();
        }
    }

    cancelActiveCommand(): boolean {
        const active = this.active;
        if (active) active.cancel();
        return !!active;
    }

    finishActiveCommand(): boolean {
        const active = this.active;
        if (active) active.finish();
        return !!active;
    }

    async enqueueDefaultCommand() {
        const command = this.selectionGizmo.commandFor();
        if (command) await this.enqueue(command);
    }
}