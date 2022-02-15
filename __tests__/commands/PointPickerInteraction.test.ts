/**
 * @jest-environment jsdom
 */

import * as THREE from "three";
import { PointPicker, PointResult } from "../../src/command/point-picker/PointPicker";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Editor } from '../../src/editor/Editor';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let editor: Editor;
let viewport: Viewport;
let pointPicker: PointPicker;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    pointPicker = new PointPicker(editor);
    editor.viewports.push(viewport);
});

afterEach(() => {
    editor.dispose();
});

let domElement: HTMLCanvasElement;

beforeEach(() => {
    domElement = editor.viewports[0].renderer.domElement;
    domElement.setPointerCapture = jest.fn();
})

test('basic move and click', async () => {
    const promise = pointPicker.execute();
    const move = new MouseEvent('pointermove', { clientX: 50, clientY: 50 });
    domElement.dispatchEvent(move);
    domElement.dispatchEvent(new MouseEvent('pointerdown'));
    const { point } = await promise;
    expect(point).toApproximatelyEqual(new THREE.Vector3());
});

test('execute with no callback and result', async () => {
    const preresult: PointResult = { point: new THREE.Vector3(), info: {} };
    const result = await pointPicker.execute({ result: preresult });
    expect(result).toBe(preresult);
});

test('execute with callback and result', async () => {
    const preresult: PointResult = { point: new THREE.Vector3(), info: {} };
    const cb = jest.fn();
    const promise = pointPicker.execute(cb, { result: preresult });
    expect(cb).toBeCalledWith(preresult);

    const move = new MouseEvent('pointermove', { clientX: 50, clientY: 50 });
    domElement.dispatchEvent(move);
    domElement.dispatchEvent(new MouseEvent('pointerdown'));

    promise.finish();
});