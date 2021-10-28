/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import { BoxChangeSelectionCommand, ClickChangeSelectionCommand } from '../../src/commands/CommandLike';
import { EditorLike } from '../../src/components/viewport/Viewport';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { SelectionInteractionManager } from '../../src/selection/SelectionInteraction';
import { SelectionManager } from '../../src/selection/SelectionManager';
import { ViewportSelector } from '../../src/selection/ViewportSelector';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let selector: ViewportSelector;
let camera: THREE.Camera;
let domElement: HTMLElement;
let editor: EditorLike
let enqueue: jest.Mock;
let selectionInteraction: SelectionInteractionManager;
let selection: SelectionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    enqueue = jest.fn();
    selection = new SelectionManager(db, materials, signals);
    selectionInteraction = new SelectionInteractionManager(selection, materials, signals);
    editor = { db, enqueue, selectionInteraction } as unknown as EditorLike;
    domElement = document.createElement('canvas');
    const parent = document.createElement('div');
    parent.appendChild(domElement);
    camera = new THREE.PerspectiveCamera();
    selector = new ViewportSelector(camera, domElement, editor);
});

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
    db.rebuildScene();
});

beforeEach(() => {
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    solid.lod.update(camera);

    // @ts-expect-error
    domElement.getBoundingClientRect = () => { return { left: 0, top: 0, width: 100, height: 100 } }
})

const pointermove = new MouseEvent('pointermove', { button: 0, clientX: 0, clientY: 0 });
const pointerdown = new MouseEvent('pointerdown', { button: 0, clientX: 0, clientY: 0 });
const pointerup = new MouseEvent('pointerup', { button: 0, clientX: 0, clientY: 0 });

test('hover and click on viewport will enqueue a change selection command', async () => {
    const start = jest.fn(), end = jest.fn();
    selector.addEventListener('start', start);
    selector.addEventListener('end', end);

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
    selector.addEventListener('start', start);
    selector.addEventListener('end', end);

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