/**
 * @jest-environment jsdom
 */
import { ViewportControlMultiplexer } from '../../src/components/viewport/ViewportControlMultiplexer';
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import { Viewport } from '../../src/components/viewport/Viewport';
import { Editor } from '../../src/editor/Editor';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { SelectionDatabase } from '../../src/selection/SelectionDatabase';
import { BoxChangeSelectionCommand, ClickChangeSelectionCommand, ViewportSelector } from '../../src/selection/ViewportSelector';
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from '../../__mocks__/FakeViewport';
import '../matchers';

let editor: Editor;
let viewport: Viewport;
let camera: THREE.Camera;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let selector: ViewportSelector;
let selection: SelectionDatabase;
let enqueue: jest.SpyInstance;
let signals: EditorSignals;
let domElement: HTMLElement;
let multiplex: ViewportControlMultiplexer;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.add(viewport);
    db = editor._db;
    camera = viewport.camera;
    selector = viewport.selector;
    selection = editor.selection;
    signals = editor.signals;
    domElement = viewport.renderer.domElement;
    multiplex = viewport.multiplexer;
    enqueue = jest.spyOn(editor, 'enqueue');
});

beforeEach(() => {
    viewport.start();
});

afterEach(() => {
    viewport.dispose();
})

let solid: visual.Solid;

beforeEach(async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
    solid.updateMatrixWorld();
});

beforeEach(() => {
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    solid.lod.update(camera);
})

const pointermove = new MouseEvent('pointermove', { button: 0, clientX: 50, clientY: 50 });
const pointerdown = new MouseEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 });
const pointerup = new MouseEvent('pointerup', { button: 0, clientX: 50, clientY: 50 });

test('hover and click on viewport will enqueue a change selection command', async () => {
    const start = jest.fn(), end = jest.fn();
    multiplex.addEventListener('start', start);
    multiplex.addEventListener('end', end);

    expect(start).toHaveBeenCalledTimes(0);
    expect(end).toHaveBeenCalledTimes(0);
    expect(enqueue).toHaveBeenCalledTimes(0);
    expect(selection.hovered.solids.size).toBe(0);
    expect(selection.selected.solids.size).toBe(0);

    domElement.dispatchEvent(pointermove);
    expect(start).toHaveBeenCalledTimes(0);
    expect(end).toHaveBeenCalledTimes(0);
    expect(enqueue).toHaveBeenCalledTimes(0);
    expect(selection.hovered.solids.size).toBe(1);
    expect(selection.selected.solids.size).toBe(0);

    domElement.dispatchEvent(pointerdown);
    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(0);
    expect(enqueue).toHaveBeenCalledTimes(0);
    expect(selection.hovered.solids.size).toBe(0);
    expect(selection.selected.solids.size).toBe(0);

    document.dispatchEvent(pointerup);
    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toBeInstanceOf(ClickChangeSelectionCommand);
});

test('click and drag makes a box selection', async () => {
    const start = jest.fn(), end = jest.fn();
    multiplex.addEventListener('start', start);
    multiplex.addEventListener('end', end);

    let pointerdown, pointermove, pointerup;

    pointerdown = new MouseEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    domElement.dispatchEvent(pointerdown);
    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(0);
    expect(enqueue).toHaveBeenCalledTimes(0);

    // move a smidge to trigger the box selection (since there is a threshold to prevent accidental boxes)
    pointermove = new MouseEvent('pointermove', { button: 0, clientX: 5, clientY: 5 });
    domElement.dispatchEvent(pointermove);
    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(0);
    expect(enqueue).toHaveBeenCalledTimes(0);
    expect(selection.hovered.solids.size).toBe(0);
    expect(selection.selected.solids.size).toBe(0);

    pointermove = new MouseEvent('pointermove', { button: 0, clientX: 100, clientY: 100 });
    domElement.dispatchEvent(pointermove);
    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(0);
    expect(enqueue).toHaveBeenCalledTimes(0);
    expect(selection.hovered.solids.size).toBe(1);
    expect(selection.selected.solids.size).toBe(0);

    pointerup = new MouseEvent('pointerup', { button: 0, clientX: 100, clientY: 100 });
    document.dispatchEvent(pointerup);
    expect(start).toHaveBeenCalledTimes(1);
    expect(end).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0][0]).toBeInstanceOf(BoxChangeSelectionCommand);
});