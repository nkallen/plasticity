/**
 * @jest-environment jsdom
 */
 jest.mock('atom-keymap');

 import { Editor } from '../../src/editor/Editor';
 import { PointPicker } from '../../src/commands/PointPicker';
 import { FakeViewport } from "../../__mocks__/FakeViewport";
 import '../matchers';
 import * as THREE from "three";
 
 let editor: Editor;
 let viewport: FakeViewport;
 let pointPicker: PointPicker;
 
 beforeEach(() => {
     editor = new Editor();
     viewport = new FakeViewport();
     pointPicker = new PointPicker(editor);
     editor.viewports.push(viewport);
 });
 
 afterEach(() => {
     editor.disposable.dispose();
 });
 
 test('basic move and click', async () => {
     const domElement = editor.viewports[0].renderer.domElement;
     const promise = pointPicker.execute();
     const move = new MouseEvent('pointermove');
     domElement.dispatchEvent(move);
     domElement.dispatchEvent(new MouseEvent('pointerdown'));
     const { point } = await promise;
     expect(point).toEqual(new THREE.Vector3());
 });