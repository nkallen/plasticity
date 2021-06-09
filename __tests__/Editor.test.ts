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

test('execute', async () => {
    const command1 = new CircleCommand(editor);
    const command2 = new CircleCommand(editor);
    editor.execute(command1);
    editor.execute(command2);
});