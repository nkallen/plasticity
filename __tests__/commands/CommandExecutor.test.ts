/**
 * @jest-environment jsdom
 */

import Command from "../../src/command/Command";
import { CommandExecutor } from "../../src/command/CommandExecutor";
import { SelectionCommandManager } from "../../src/command/SelectionCommandManager";
import { Editor } from "../../src/editor/Editor";
import { Delay } from "../../src/util/SequentialExecutor";
import '../matchers';

describe(CommandExecutor, () => {
    let selectionGizmo: SelectionCommandManager;
    let editor: Editor;

    beforeEach(() => {
        editor = new Editor();

        selectionGizmo = new SelectionCommandManager(editor);
    })

    let executor: CommandExecutor;
    beforeEach(() => {
        executor = new CommandExecutor(editor);
    })

    test('basic successful execution', async () => {
        const command = new DelayedCommand(editor);
        const p = executor.enqueue(command);
        expect(command['state']).toBe('None');
        command.delay.resolve();
        await p;
        expect(command['state']).toBe('Finished');
    });

    test('basic unsuccessful execution', async () => {
        const command = new DelayedCommand(editor);
        const p = executor.enqueue(command);
        expect(command['state']).toBe('None');
        command.delay.reject();
        await p;
        expect(command['state']).toBe('Cancelled');
    });

    test('unsuccessful execution catches exception and continues to next command', async () => {
        const command1_fails = new ErroringCommand(editor);
        const command2_succeeds = new FastCommand(editor);
        await executor.enqueue(command1_fails);
        await executor.enqueue(command2_succeeds);

        expect(command1_fails['state']).toBe('Cancelled');
        expect(command2_succeeds['state']).toBe('Finished');
    });

    test('enqueue cancels active commands and executes the most recent', async () => {
        const command1 = new DelayedCommand(editor);
        const command2 = new DelayedCommand(editor);
        const command3 = new DelayedCommand(editor);

        const p1 = executor.enqueue(command1);
        const p2 = executor.enqueue(command2);
        const p3 = executor.enqueue(command3);

        expect(command1['state']).toBe('Interrupted');
        expect(command2['state']).toBe('None');
        expect(command3['state']).toBe('None');

        command1.delay.reject();
        command2.delay.resolve();
        command3.delay.resolve();

        await p1;
        await p2;
        await p3;

        expect(command1['state']).toBe('Interrupted');
        expect(command2['state']).toBe('None');
        expect(command3['state']).toBe('Finished');
    });
});

class DelayedCommand extends Command {
    delay = new Delay<void>();

    async execute(): Promise<void> {
        await this.delay.promise;
    }
}

class ErroringCommand extends Command {
    async execute(): Promise<void> {
        throw new Error("I'm an error");
    }
}

class FastCommand extends Command {
    async execute(): Promise<void> {
    }
}