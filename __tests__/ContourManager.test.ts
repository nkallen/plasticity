import * as THREE from "three";
import { CircleFactory } from "../src/commands/circle/CircleFactory";
import ContourManager from '../src/commands/ContourManager';
import CurveFactory from "../src/commands/curve/CurveFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let silentSignals: EditorSignals;
let makeCircle1: CircleFactory;
let makeCircle2: CircleFactory;
let makeCircle3: CircleFactory;
let makeCurve: CurveFactory;
let contours: ContourManager;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    silentSignals = new EditorSignals(); // not connected to the db, so these never trigger
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle1 = new CircleFactory(db, materials, silentSignals);
    makeCircle2 = new CircleFactory(db, materials, silentSignals);
    makeCircle3 = new CircleFactory(db, materials, silentSignals);
    makeCurve = new CurveFactory(db, materials, silentSignals);
    contours = new ContourManager(db, silentSignals);
})

test('three intersecting circles, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await contours.add(circle2);
    expect(db.visibleObjects.length).toBe(2 + 4);

    makeCircle3.center = new THREE.Vector3(0, 1.1, 0);
    makeCircle3.radius = 1;
    const circle3 = await makeCircle3.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(6 + 1);

    await contours.add(circle3);
    expect(db.visibleObjects.length).toBe(3 + 8);

    await contours.remove(circle3);
    db.removeItem(circle3);
    expect(db.visibleObjects.length).toBe(6);

    await contours.remove(circle2);
    db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(2);
});

test('two non-intersecting circles', async() => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 5, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await contours.add(circle2);
    expect(db.visibleObjects.length).toBe(4);

    await contours.remove(circle2);
    db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(2);
});

test('open curve through circle, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle);
    expect(db.visibleObjects.length).toBe(2);

    makeCurve.points.push(new THREE.Vector3(-2, 2, 0))
    makeCurve.points.push(new THREE.Vector3());
    makeCurve.points.push(new THREE.Vector3(-2, -2, 0));
    const curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await contours.add(curve);
    expect(db.visibleObjects.length).toBe(2 + 5);

    await contours.remove(curve);
    db.removeItem(curve);
    expect(db.visibleObjects.length).toBe(2);
});

test('userAddedCurve event is dispatched only when the user interacts with the db, not when fragments are automatically created; other events behave the same in both cases', async () => {
    const userAddedCurve = jest.fn();
    signals.userAddedCurve.add(userAddedCurve);
    const objectAdded = jest.fn();
    signals.objectAdded.add(objectAdded);

    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;

    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.enqueue(() => Promise.resolve());

    expect(db.visibleObjects.length).toBe(1);
    expect(userAddedCurve.mock.calls.length).toBe(1);
    expect(objectAdded.mock.calls.length).toBe(1);

    await contours.add(circle1);
    await contours.enqueue(() => Promise.resolve());

    expect(db.visibleObjects.length).toBe(2);
    expect(userAddedCurve.mock.calls.length).toBe(1);
    expect(objectAdded.mock.calls.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;

    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.enqueue(() => Promise.resolve());

    expect(db.visibleObjects.length).toBe(3);
    expect(userAddedCurve.mock.calls.length).toBe(2);
    expect(objectAdded.mock.calls.length).toBe(3);

    await contours.add(circle2);
    await contours.enqueue(() => Promise.resolve());

    expect(db.visibleObjects.length).toBe(2 + 4);
    expect(userAddedCurve.mock.calls.length).toBe(2);
    expect(objectAdded.mock.calls.length).toBe(3+4);
});

test("removing circles in reverse order works", async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await contours.add(circle2);
    expect(db.visibleObjects.length).toBe(2 + 4);

    await contours.remove(circle1);
    db.removeItem(circle1);
    expect(db.visibleObjects.length).toBe(2);
})