/**
 * @jest-environment jsdom
 */
jest.mock('atom-keymap');

import { CircleCommand } from '../src/commands/Command';
import { Editor } from '../src/Editor';
import './matchers';

let editor: Editor;

beforeEach(() => {
    editor = new Editor();
});

afterEach(() => {
    editor.disposable.dispose();
});

test('enqueue cancels active commands and executes the most recent', async () => {
    const command1 = new CircleCommand(editor);
    const command2 = new CircleCommand(editor);
    const command3 = new CircleCommand(editor);

    editor.enqueue(command1);
    await Promise.resolve();
    editor.enqueue(command2);
    await Promise.resolve();
    editor.enqueue(command3);
    await Promise.resolve();

    expect(command1.state).toBe('Cancelled');
    expect(command2.state).toBe('None');
    expect(command3.state).toBe('None');
});