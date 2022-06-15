/**
 * @jest-environment jsdom
 */

import * as THREE from "three";
import { PointPicker, PointResult } from "../../src/command/point-picker/PointPicker";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Editor } from '../../src/editor/Editor';
import { PointSnap } from "../../src/editor/snaps/PointSnap";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let editor: Editor;
let viewport: Viewport;
let pointPicker: PointPicker;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    pointPicker = new PointPicker(editor);
    editor.viewports.add(viewport);
    document.body.appendChild(viewport.domElement);
});

afterEach(() => {
    editor.dispose();
});

let domElement: HTMLCanvasElement;

beforeEach(() => {
    domElement = [...editor.viewports][0].renderer.domElement;
    domElement.setPointerCapture = jest.fn();
})

test('basic move and click', async () => {
    const promise = pointPicker.execute();
    const move = new MouseEvent('pointermove', { clientX: 50, clientY: 50 });
    domElement.dispatchEvent(move);
    domElement.dispatchEvent(new MouseEvent('pointerdown'));
    domElement.dispatchEvent(new MouseEvent('pointerup'));
    const { point } = await promise;
    expect(point).toApproximatelyEqual(new THREE.Vector3());
});

test('execute with no callback and preresult', async () => {
    const preresult: PointResult = { point: new THREE.Vector3(), info: { orientation: new THREE.Quaternion(), snap: new PointSnap() } };
    const result = await pointPicker.execute({ result: preresult });
    expect(result).toBe(preresult);
});

test('execute with callback and preresult', async () => {
    const preresult: PointResult = { point: new THREE.Vector3(), info: { orientation: new THREE.Quaternion(), snap: new PointSnap() } };
    const cb = jest.fn();
    const promise = pointPicker.execute(cb, { result: preresult });
    expect(cb).toBeCalledWith(preresult);

    const move = new MouseEvent('pointermove', { clientX: 50, clientY: 50 });
    domElement.dispatchEvent(move);
    domElement.dispatchEvent(new MouseEvent('pointerdown'));
    domElement.dispatchEvent(new MouseEvent('pointerup'));

    promise.finish();
});

test('defaults', async () => {
    const position = new THREE.Vector3(1, 2, 3);
    const orientation = new THREE.Quaternion();
    const promise = pointPicker.execute({ default: { position, orientation } });
    editor.onViewportActivated(viewport);
    domElement.dispatchEvent(new CustomEvent('point-picker:finish', { bubbles: true }));
    const { point } = await promise;
    expect(point).toApproximatelyEqual(position);
})