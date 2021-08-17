/**
 * @jest-environment jsdom
 */

import * as THREE from "three";
import { CornerBoxCommand } from '../src/commands/GeometryCommands';
import { Viewport } from '../src/components/viewport/Viewport';
import { Editor } from '../src/editor/Editor';
import { PlaneSnap } from "../src/editor/SnapManager";
import { Executor } from '../src/util/Cancellable';
import { MakeViewport } from '../__mocks__/FakeViewport';
import './matchers';

let current: Promise<any> = Promise.resolve();

jest.mock('../src/util/Cancellable', () => {
    const original = jest.requireActual('../src/util/Cancellable');
    class CancellablePromise<T> extends original.CancellablePromise<T> {

        constructor(executor: Executor<T>) {
            super(executor);
            current = this.promise;
        }
    }
    return {
        __esModule: true,
        ...original,
        CancellablePromise,
    }
});

let editor: Editor;
let viewport: Viewport;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);
});

afterEach(() => {
    editor.disposable.dispose();
});

async function step() {
    await Promise.resolve();
    await current;
    await Promise.resolve();
}

let pointerdown, pointermove, pointerup;

const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

test.skip('create a box and fillet an edge', async () => {
    const domElement = viewport.renderer.domElement;
    const camera = viewport.camera;

    camera.position.set(0, 0, 10);
    camera.lookAt(new THREE.Vector3());

    editor.enqueue(new CornerBoxCommand(editor));

    pointermove = new MouseEvent('pointermove', { button: 0, clientX: 40, clientY: 40 });
    domElement.dispatchEvent(pointermove);
    pointerdown = new MouseEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    domElement.dispatchEvent(pointerdown);
    pointerup = new MouseEvent('pointerup', { button: 0, clientX: 0, clientY: 0 });
    domElement.dispatchEvent(pointerup);

    await step();

    pointermove = new MouseEvent('pointermove', { button: 0, clientX: 60, clientY: 60 });
    domElement.dispatchEvent(pointermove);

    pointerdown = new MouseEvent('pointerdown', { button: 0, clientX: 100, clientY: 100 });
    domElement.dispatchEvent(pointerdown);
    pointerup = new MouseEvent('pointerup', { button: 0, clientX: 100, clientY: 100 });
    domElement.dispatchEvent(pointerup);

    await step();

    camera.position.set(0, 10, 5);
    camera.lookAt(new THREE.Vector3());

    pointermove = new MouseEvent('pointermove', { button: 0, clientX: 50, clientY: 40 });
    domElement.dispatchEvent(pointermove);

    pointerdown = new MouseEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 });
    domElement.dispatchEvent(pointerdown);
    pointerup = new MouseEvent('pointerup', { button: 0, clientX: 50, clientY: 50 });
    domElement.dispatchEvent(pointerup);

    await step();

    await step();

});