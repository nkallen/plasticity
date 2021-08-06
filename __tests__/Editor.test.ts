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