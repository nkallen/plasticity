/**
 * @jest-environment jsdom
 */

import * as THREE from "three";
import * as cmd from '../src/commands/GeometryCommands';
import { Viewport } from '../src/components/viewport/Viewport';
import { Editor } from '../src/editor/Editor';
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

beforeEach(() => {
    // jsdom bullshit
    const domElement = editor.viewports[0].renderer.domElement;
    domElement.setPointerCapture = jest.fn();
    domElement.releasePointerCapture = jest.fn();
})

let pointerdown, pointermove, pointerup;

const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

test.skip('create a box and fillet an edge', async () => {
    const bbox = new THREE.Box3();
    const center = new THREE.Vector3();

    const viewport = editor.viewports[0];
    const domElement = viewport.renderer.domElement;
    const camera = viewport.camera;
    const rect = domElement.getBoundingClientRect();
    const info = (x, y) => {
        return { pointerId: 1, button: 0, clientX: rect.left + (x + 1) / 2 * rect.width, clientY: rect.top - (y - 1) / 2 * rect.height };
    }

    camera.position.set(0, 0, 100);
    camera.lookAt(new THREE.Vector3());
    camera.updateMatrixWorld();

    const command = new cmd.CornerBoxCommand(editor);
    editor.enqueue(command);

    pointermove = new PointerEvent('pointermove', info(0, 0));
    domElement.dispatchEvent(pointermove);
    pointerdown = new PointerEvent('pointerdown', info(0, 0));
    domElement.dispatchEvent(pointerdown);
    pointerup = new PointerEvent('pointerup', info(0, 0));
    domElement.dispatchEvent(pointerup);

    await step();

    pointermove = new PointerEvent('pointermove', info(0.5, 0.5));
    domElement.dispatchEvent(pointermove);
    pointerdown = new PointerEvent('pointerdown', info(0.5, 0.5));
    domElement.dispatchEvent(pointerdown);
    pointerup = new PointerEvent('pointerup', info(0.5, 0.5));
    domElement.dispatchEvent(pointerup);

    await step();

    camera.position.set(0, 10, 5);
    camera.lookAt(new THREE.Vector3());
    camera.updateMatrixWorld();

    pointermove = new PointerEvent('pointermove', info(0, 0.5));
    domElement.dispatchEvent(pointermove);
    pointerdown = new PointerEvent('pointerdown', info(0, 0.5));
    domElement.dispatchEvent(pointerdown);
    pointerup = new PointerEvent('pointerup', info(0, 0.5));
    domElement.dispatchEvent(pointerup);

    await command.finished;

    const box = editor.selection.selected.solids.first;
    const edge = box.edges.get(1);

    bbox.setFromObject(edge);
    bbox.getCenter(center);

    camera.position.set(0, 100, 100);
    camera.lookAt(center);
    camera.updateMatrixWorld();

    pointermove = new PointerEvent('pointermove', info(0, 0));
    domElement.dispatchEvent(pointermove);
    pointerdown = new PointerEvent('pointerdown', info(0, 0));
    domElement.dispatchEvent(pointerdown);
    pointerup = new PointerEvent('pointerup', info(0, 0));
    domElement.dispatchEvent(pointerup);

    await step();

    let keydown;
    keydown = new KeyboardEvent('keydown', { key: 'd' });
    domElement.dispatchEvent(keydown);

    // pointermove = new PointerEvent('pointermove', info(1, 1));
    // domElement.dispatchEvent(pointermove);
    // pointerdown = new PointerEvent('pointerdown', info(1, 1));
    // domElement.dispatchEvent(pointerdown);
    // pointerup = new PointerEvent('pointerup', info(1, 1));
    // domElement.dispatchEvent(pointerup);
});

const PointerEvent = MouseEvent;