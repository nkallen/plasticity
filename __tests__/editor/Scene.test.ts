import * as THREE from 'three';
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from '../../src/commands/circle/CircleFactory';
import ContourManager from '../../src/editor/curves/ContourManager';
import { PlanarCurveDatabase } from '../../src/editor/curves/PlanarCurveDatabase';
import { RegionManager } from '../../src/editor/curves/RegionManager';
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
let contours: ContourManager;
let curves: PlanarCurveDatabase;
let regions: RegionManager;
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
    curves = new PlanarCurveDatabase(db, materials, signals);
    regions = new RegionManager(db, curves);
    contours = new ContourManager(db, curves, regions, signals);
    scene = new Scene(db, materials, signals);
    box = c3d.ActionSolid.ElementarySolid(points.map(p => point2point(p)), c3d.ElementaryShellType.Block, names);
})

let objectHidden: jest.Mock<any>;
let objectUnhidden: jest.Mock<any>;
let objectUnselectable: jest.Mock<any>;
let objectSeletable: jest.Mock<any>;
let sceneGraphChanged: jest.Mock<any>;
beforeEach(() => {
    objectHidden = jest.fn();
    objectUnhidden = jest.fn();
    objectUnselectable = jest.fn();
    objectSeletable = jest.fn();
    sceneGraphChanged = jest.fn();
    signals.objectHidden.add(objectHidden);
    signals.objectUnhidden.add(objectUnhidden);
    signals.objectUnselectable.add(objectUnselectable);
    signals.objectSelectable.add(objectSeletable);
    signals.sceneGraphChanged.add(sceneGraphChanged);
});

let v: visual.Solid;
beforeEach(async () => {
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);

    v = await db.addItem(box) as visual.Solid;
    expect(db.lookup(v)).toBeTruthy();
    expect(scene.visibleObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(1);

    expect(objectHidden).toBeCalledTimes(0);
    expect(objectUnhidden).toBeCalledTimes(0);
    expect(sceneGraphChanged).toBeCalledTimes(0);
})

test("hide & unhide", async () => {
    expect(sceneGraphChanged).toBeCalledTimes(0);
    scene.makeHidden(v, true);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
    expect(sceneGraphChanged).toBeCalledTimes(1);

    scene.makeHidden(v, false);
    expect(scene.visibleObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(1);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(1);
    expect(sceneGraphChanged).toBeCalledTimes(2);
})

test("hide twice doesn't send the same signal twice", async () => {
    scene.makeHidden(v, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(v, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
})

test("toggle visibility", async () => {
    scene.makeVisible(v, false);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
    expect(sceneGraphChanged).toBeCalledTimes(1);

    scene.makeVisible(v, true);
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(1);
    expect(sceneGraphChanged).toBeCalledTimes(2);
})

test("toggle visibility twice doesn't send the same signal twice", async () => {
    scene.makeVisible(v, false);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeVisible(v, false);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
})

test("hide & makeVisible(false) doesn't send the same signal twice", async () => {
    scene.makeHidden(v, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeVisible(v, false);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
})

test("unhideAll doesn't send the signal if the item is still invisible", async () => {
    scene.makeHidden(v, true);
    scene.makeVisible(v, false);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);

    await scene.unhideAll();
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
})

test("hiding a transitively invisible item doesn't send a signal; unhiding it neither", async () => {
    const group = scene.createGroup();
    scene.moveToGroup(v, group);
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);

    scene.makeHidden(group, true);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(v, true);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(v, false);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);
})

test("hiding a transitively invisible item doesn't send a signal; unhideAll neither", async () => {
    const group = scene.createGroup();
    scene.moveToGroup(v, group);
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);

    scene.makeHidden(group, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(v, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    await scene.unhideAll();
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})

test("hiding a transitively invisible item doesn't send a signal; unhideAll neither", async () => {
    const group = scene.createGroup();
    scene.moveToGroup(v, group);
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);

    scene.makeHidden(group, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(v, true);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeVisible(v, false);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    await scene.unhideAll();
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(1);
})

test("toggle selectable", async () => {
    scene.makeSelectable(v, false);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);

    scene.makeSelectable(v, true);
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(1);
})

test("group visibility", async () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);
    scene.moveToGroup(v, group);
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);
    scene.makeHidden(group, true);
    expect(scene.selectableObjects.length).toBe(0);
    expect(scene.visibleObjects.length).toBe(0);
});

test("group selectability", async () => {
    const group = scene.createGroup();
    expect(scene.visibleObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(1);
    scene.moveToGroup(v, group);
    expect(scene.visibleObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(1);
    scene.makeSelectable(group, false);
    expect(scene.visibleObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(0);
});

test("makeSelectable descent dispatch of signal", async () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(1);
    expect(scene.visibleObjects.length).toBe(1);
    scene.moveToGroup(v, group);

    scene.makeSelectable(group, false);
    expect(objectUnselectable).toBeCalledTimes(2);
    expect(objectSeletable).toBeCalledTimes(0);

    scene.makeSelectable(group, true);
    expect(objectUnselectable).toBeCalledTimes(2);
    expect(objectSeletable).toBeCalledTimes(2);
})

test("makeVisible descent dispatch of signal", async () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(1);
    scene.moveToGroup(v, group);

    scene.makeVisible(group, false);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeVisible(group, true);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})

test("makeHidden descent dispatch of signal", async () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(1);
    scene.moveToGroup(v, group);

    scene.makeHidden(group, true);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    scene.makeHidden(group, false);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})

test("makeHidden & unhideAll descent dispatch of signal", async () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(1);
    scene.moveToGroup(v, group);

    scene.makeHidden(group, true);
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(0);

    await scene.unhideAll();
    expect(objectHidden).toBeCalledTimes(2);
    expect(objectUnhidden).toBeCalledTimes(2);
})

test("makeVisible Virtual Groups", () => {
    const group = scene.createGroup();
    expect(scene.selectableObjects.length).toBe(1);
    scene.moveToGroup(v, group);
    expect(objectHidden).toBeCalledTimes(0);
    expect(objectUnhidden).toBeCalledTimes(0);
    expect(scene.visibleObjects.length).toBe(1);
    expect(scene.selectableObjects.length).toBe(1);

    scene.makeVisible(group.solids, false);
    expect(objectHidden).toBeCalledTimes(1);
    expect(objectUnhidden).toBeCalledTimes(0);
    expect(scene.visibleObjects.length).toBe(0);
    expect(scene.selectableObjects.length).toBe(0);
})

test("automatics are included in selectable objects", async () => {
    expect(scene.selectableObjects.length).toBe(1);
    const makeCircle = new CenterCircleFactory(contours, materials, signals);
    let circle: visual.SpaceInstance<visual.Curve3D>, circle2: visual.SpaceInstance<visual.Curve3D>;
    makeCircle.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle.radius = 1;
    await contours.transaction(async () => {
        circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
    expect(db.findAutomatics().length).toBe(2);
    expect(scene.selectableObjects.length).toBe(4);
})

test("automatics are included in selectable objects", async () => {
    expect(scene.selectableObjects.length).toBe(1);
    const makeCircle = new CenterCircleFactory(contours, materials, signals);
    let circle: visual.SpaceInstance<visual.Curve3D>;
    makeCircle.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle.radius = 1;
    await contours.transaction(async () => {
        circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
    expect(db.findAutomatics().length).toBe(2);
    expect(scene.visibleObjects.length).toBe(4);
})

test("getMaterial walk=true", () => {
    const material = new THREE.Material();
    const materialId = materials.add("name", material);
    const group = scene.createGroup();
    scene.moveToGroup(v, group);
    scene.setMaterial(group, materialId);
    expect(scene.getMaterial(v)).toBe(undefined);
    expect(scene.getMaterial(v, true)).toBe(material);
})