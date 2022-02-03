/**
 * @jest-environment jsdom
 */

import * as THREE from "three";
import { PointPicker } from "../../src/command/PointPicker";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Editor } from '../../src/editor/Editor';
import { Finish } from "../../src/util/Cancellable";
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