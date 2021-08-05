/**
 * @jest-environment jsdom
 */
jest.mock('atom-keymap');

import Command from '../src/commands/Command';
import { CenterCircleCommand } from '../src/commands/GeometryCommands';
import { Editor } from '../src/editor/Editor';
import { MakeViewport } from '../__mocks__/FakeViewport';
import './matchers';

let editor: Editor;

beforeEach(() => {
    editor = new Editor();
});

afterEach(() => {
    editor.disposable.dispose();
});

test('enqueue cancels active commands and executes the most recent', async () => {
    const command1 = new CenterCircleCommand(editor);
    const command2 = new CenterCircleCommand(editor);
    const command3 = new CenterCircleCommand(editor);

    editor.enqueue(command1);
    await Promise.resolve();
    editor.enqueue(command2);
    await Promise.resolve();
    editor.enqueue(command3);
    await Promise.resolve();

    expect(command1['state']).toBe('Cancelled');
    expect(command2['state']).toBe('None');
    expect(command3['state']).toBe('None');
});

class ErroringCommand extends Command {
    async execute(): Promise<void> {
        throw new Error("I'm an error");
    }
}

class FastCommand extends Command {
    async execute(): Promise<void> {
    }
}

test('erroring commands are ok, allowing subsequent commands to procede', async () => {
    const command1 = new ErroringCommand(editor);
    const command2 = new FastCommand(editor);

    await editor.enqueue(command1);
    await editor.enqueue(command2);

    expect(command1['state']).toBe('Cancelled');
    expect(command2['state']).toBe('Finished');
});

test('keeps track of active viewport', () => {
    const viewport1 = MakeViewport(editor);
    const viewport2 = MakeViewport(editor);

    viewport1.start(); viewport2.start();

    editor.viewports.push(viewport1);
    editor.viewports.push(viewport2);

    expect(editor.activeViewport).toBeUndefined;

    viewport1.selector.dispatchEvent({ type: 'start' });
    expect(editor.activeViewport).toBe(viewport1);

    viewport2.selector.dispatchEvent({ type: 'start' });
    expect(editor.activeViewport).toBe(viewport2);

    viewport1.dispose();
    viewport2.dispose();
});