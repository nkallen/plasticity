/**
 * @jest-environment jsdom
 */

import * as THREE from "three";
import { CenterCircleCommand } from "../src/commands/circle/CircleCommand";
import SphereFactory from '../src/commands/sphere/SphereFactory';
import { Editor } from '../src/editor/Editor';
import { Cancel } from '../src/util/Cancellable';
import * as visual from '../src/visual_model/VisualModel';
import { MakeViewport } from '../__mocks__/FakeViewport';
import './matchers';

let editor: Editor;

beforeEach(() => {
    editor = new Editor();
});

afterEach(() => {
    editor.dispose();
});

test('keeps track of active viewport', () => {
    const viewport1 = MakeViewport(editor);
    const viewport2 = MakeViewport(editor);

    viewport1.start(); viewport2.start();

    editor.viewports.push(viewport1);
    editor.viewports.push(viewport2);

    expect(editor.activeViewport).toBe(viewport1);

    viewport1.multiplexer.dispatchEvent({ type: 'start' });
    expect(editor.activeViewport).toBe(viewport1);

    viewport2.multiplexer.dispatchEvent({ type: 'start' });1
    expect(editor.activeViewport).toBe(viewport2);

    viewport1.dispose();
    viewport2.dispose();
});

test('executes a command', async () => {
    const command = new CenterCircleCommand(editor);
    editor.enqueue(command);
    const finished = command.finished;
    command.cancel();
    await expect(finished).rejects.toBeInstanceOf(Cancel);
});

test("simple integration test", async () => {
    const makeSphere = new SphereFactory(editor.db, editor.materials, editor.signals);
    makeSphere.center = new THREE.Vector3();
    makeSphere.radius = 1;
    await makeSphere.commit() as visual.Solid;
    expect(1).toBe(1);
})