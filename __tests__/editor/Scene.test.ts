import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Scene } from '../../src/editor/Scene';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { point2point } from '../../src/util/Conversion';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let scene: Scene;
let materials: MaterialDatabase;
let signals: EditorSignals;
let box: c3d.Solid;

const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(1, 1, 1),
]

const names = new c3d.SNameMaker(c3d.CreatorType.ElementarySolid, c3d.ESides.SideNone, 0);

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    scene = new Scene(db, materials, signals);
    box = c3d.ActionSolid.ElementarySolid(points.map(p => point2point(p)), c3d.ElementaryShellType.Block, names);
})

test("hide & unhide", async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(1);

    scene.makeHidden(v, true);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);

    scene.makeHidden(v, false);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(1);
})

test("toggle visibility", async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(1);

    scene.makeVisible(v, false);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);

    scene.makeVisible(v, true);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(1);
})

test("toggle selectable", async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);

    const v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(1);

    scene.makeSelectable(v, false);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);

    scene.makeSelectable(v, true);
    expect(db.temporaryObjects.children.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(1);
})

test("group visibility", async () => {
    const group = scene.createGroup();
    expect(scene.visibleObjects.length).toBe(0);
    const v = await db.addItem(box) as visual.Solid;
    scene.moveToGroup(v, group);
    expect(scene.visibleObjects.length).toBe(1);
    scene.makeHidden(group, true);
    expect(scene.visibleObjects.length).toBe(0);
});

test("group selectability", async () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(0);
    const v = await db.addItem(box) as visual.Solid;
    scene.moveToGroup(v, group);
    expect(scene.selectableObjects.length).toBe(1);
    scene.makeSelectable(group, false);
    expect(scene.selectableObjects.length).toBe(0);
});

test("makeSelectable descent dispatch of signal", async () => {
    const objectUnselectable = jest.fn(), objectSeletable = jest.fn();
    signals.objectUnselectable.add(objectUnselectable);
    signals.objectSelectable.add(objectSeletable);

    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(0);
    const v = await db.addItem(box) as visual.Solid;
    scene.moveToGroup(v, group);

    scene.makeSelectable(group, false);
    expect(objectUnselectable).toBeCalledTimes(2);
    expect(objectSeletable).toBeCalledTimes(0);

    scene.makeSelectable(group, true);
    expect(objectUnselectable).toBeCalledTimes(2);
    expect(objectSeletable).toBeCalledTimes(2);
})

test("makeVisible descent dispatch of signal", async () => {
    const objectHidden = jest.fn(), objectUnhidden = jest.fn();
    signals.objectHidden.add(objectHidden);
    signals.objectUnhidden.add(objectUnhidden);

    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(0);
    const v = await db.addItem(box) as visual.Solid;
    scene.moveToGroup(v, group);

    scene.makeVisible(group, false);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeVisible(group, true);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})

test("makeHidden descent dispatch of signal", async () => {
    const objectHidden = jest.fn(), objectUnhidden = jest.fn();
    signals.objectHidden.add(objectHidden);
    signals.objectUnhidden.add(objectUnhidden);

    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(0);
    const v = await db.addItem(box) as visual.Solid;
    scene.moveToGroup(v, group);

    scene.makeHidden(group, true);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(group, false);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})

test("makeHidden & unhideAll descent dispatch of signal", async () => {
    const objectHidden = jest.fn(), objectUnhidden = jest.fn();
    signals.objectHidden.add(objectHidden);
    signals.objectUnhidden.add(objectUnhidden);

    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(0);
    const v = await db.addItem(box) as visual.Solid;
    scene.moveToGroup(v, group);

    scene.makeHidden(group, true);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    await scene.unhideAll();
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})