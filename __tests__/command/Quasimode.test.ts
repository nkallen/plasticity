/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { ObjectPicker } from "../../src/command/ObjectPicker";
import { Quasimode } from "../../src/command/Quasimode";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import FilletFactory from "../../src/commands/fillet/FilletFactory";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Editor } from "../../src/editor/Editor";
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { HasSelectedAndHovered } from "../../src/selection/SelectionDatabase";
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let db: GeometryDatabase;
let editor: Editor;
let viewport: Viewport;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);

    db = editor._db;
})

let fillet: FilletFactory;
let objectPicker: ObjectPicker;

let selection: HasSelectedAndHovered;
beforeEach(() => {
    fillet = new FilletFactory(db, editor.materials, editor.signals);
    selection = editor.selection.makeTemporary();
    objectPicker = new ObjectPicker(editor, selection);
})

let item: visual.SpaceInstance<visual.Curve3D>;
beforeEach(async () => {
    const makeCircle = new CenterCircleFactory(editor.db, editor.materials, editor.signals);
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    item = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
});

let quasi: Quasimode<any>;

beforeEach(() => {
    quasi = new Quasimode("name", editor, fillet, objectPicker);
})

test('start and stop', async () => {
    const pause = jest.spyOn(fillet, 'pause');
    const resume = jest.spyOn(fillet, 'resume');

    const promise = quasi.execute(() => { });
    const start = new CustomEvent("command:quasimode:start");
    document.body.dispatchEvent(start);

    expect(pause).toHaveBeenCalledTimes(1);

    const stop = new CustomEvent("command:quasimode:stop");
    document.body.dispatchEvent(stop);

    promise.finish();
    await promise;
    expect(resume).toHaveBeenCalledTimes(1);
})

test('start and finish', async () => {
    const pause = jest.spyOn(fillet, 'pause');
    const resume = jest.spyOn(fillet, 'resume');

    const promise = quasi.execute(() => { });
    const event = new CustomEvent("command:quasimode:start");
    document.body.dispatchEvent(event);

    expect(pause).toHaveBeenCalledTimes(1);
    promise.finish();
    await promise;
    expect(resume).toHaveBeenCalledTimes(0);
})

test('add to selection', async () => {
    let count = 0;
    const promise = quasi.execute(() => count++);
    const start = new CustomEvent("command:quasimode:start");
    document.body.dispatchEvent(start);

    expect(count).toBe(0);
    selection.selected.add(item);
    expect(count).toBe(1);

    promise.finish();
    await promise;
})