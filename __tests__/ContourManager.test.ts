import * as THREE from "three";
import { CircleFactory } from "../src/commands/circle/CircleFactory";
import ContourManager from '../src/commands/ContourManager';
import { ContourFilletFactory } from "../src/commands/curve/ContourFilletFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
import JoinCurvesFactory from "../src/commands/curve/JoinCurvesFactory";
import LineFactory from "../src/commands/line/LineFactory";
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
let makeCurve1: CurveFactory;
let makeCurve2: CurveFactory;
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
    makeCurve1 = new CurveFactory(db, materials, silentSignals);
    makeCurve2 = new CurveFactory(db, materials, silentSignals);
    contours = new ContourManager(db, silentSignals);
})

test('adding and deleting a circle', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    await contours.remove(circle1);
    await db.removeItem(circle1);
    expect(db.visibleObjects.length).toBe(0);
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
    await db.removeItem(circle3);
    expect(db.visibleObjects.length).toBe(6);

    await contours.remove(circle2);
    await db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(2);
});

test('two non-intersecting circles', async () => {
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
    await db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(2);
});

test('open curve through circle, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle);
    expect(db.visibleObjects.length).toBe(2);

    makeCurve1.points.push(new THREE.Vector3(-2, 2, 0))
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
    const curve = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await contours.add(curve);
    expect(db.visibleObjects.length).toBe(2 + 5);

    await contours.remove(curve);
    await db.removeItem(curve);
    expect(db.visibleObjects.length).toBe(2);
});

test("joints (two open curves intersect at start/end points)", async () => {
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
    const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);
    await contours.add(curve1);
    expect(db.visibleObjects.length).toBe(2);

    makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
    makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
    const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);
    await contours.add(curve2);
    expect(db.visibleObjects.length).toBe(4);

    const joints1 = contours.lookup(curve1).joints;
    const joints2 = contours.lookup(curve2).joints;

    expect(joints1.start).toBeUndefined();
    expect(joints1.stop.on1.curve).toBe(curve1);
    expect(joints1.stop.on1.t).toBe(1);
    expect(joints1.stop.on2.curve).toBe(curve2);
    expect(joints1.stop.on2.t).toBe(0);

    expect(joints2.stop).toBeUndefined();
    expect(joints2.start.on1.curve).toBe(curve2);
    expect(joints2.start.on1.t).toBe(0);
    expect(joints2.start.on2.curve).toBe(curve1);
    expect(joints2.start.on2.t).toBe(1);
});

test('userAddedCurve event is dispatched only when the user interacts with the db, not when fragments are automatically created; other events behave the same in both cases', async () => {
    const userAddedCurve = jest.fn();
    signals.userAddedCurve.add(userAddedCurve);
    const objectAdded = jest.fn();
    signals.objectAdded.add(objectAdded);

    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;

    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.visibleObjects.length).toBe(1);
    expect(userAddedCurve.mock.calls.length).toBe(1);
    expect(objectAdded.mock.calls.length).toBe(1);

    await contours.add(circle1);

    expect(db.visibleObjects.length).toBe(2);
    expect(userAddedCurve.mock.calls.length).toBe(1);
    expect(objectAdded.mock.calls.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;

    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.visibleObjects.length).toBe(3);
    expect(userAddedCurve.mock.calls.length).toBe(2);
    expect(objectAdded.mock.calls.length).toBe(3);

    await contours.add(circle2);

    expect(db.visibleObjects.length).toBe(2 + 4);
    expect(userAddedCurve.mock.calls.length).toBe(2);
    expect(objectAdded.mock.calls.length).toBe(3 + 4);
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
    await db.removeItem(circle1);
    expect(db.visibleObjects.length).toBe(2);
})

test("removing lines in reverse order works", async () => {
    const makeCurve1 = new CurveFactory(db, materials, signals);
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, 4, 0));
    const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(curve1);

    expect(db.visibleObjects.length).toBe(2);

    const makeCurve2 = new CurveFactory(db, materials, signals);
    makeCurve2.points.push(new THREE.Vector3(-2, 4, 0));
    makeCurve2.points.push(new THREE.Vector3(0, 5, 0));
    const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(curve2);

    expect(db.visibleObjects.length).toBe(4);

    const makeCurve3 = new CurveFactory(db, materials, signals);
    makeCurve3.points.push(new THREE.Vector3(0, 5, 0));
    makeCurve3.points.push(new THREE.Vector3());
    const curve3 = await makeCurve3.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(curve3);

    expect(db.visibleObjects.length).toBe(6);

    await contours.remove(curve1);
    db.removeItem(curve1);
    expect(db.visibleObjects.length).toBe(4);

    await contours.remove(curve2);
    await db.removeItem(curve2);
    expect(db.visibleObjects.length).toBe(2);

    await contours.remove(curve3);
    await db.removeItem(curve3);
    expect(db.visibleObjects.length).toBe(0);
});

test("race condition", async () => {
    const makeLine1 = new LineFactory(db, materials, signals);
    makeLine1.p1 = new THREE.Vector3();
    makeLine1.p2 = new THREE.Vector3(1, 1, 0);
    const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(line1);

    const makeLine2 = new LineFactory(db, materials, signals);
    makeLine2.p1 = new THREE.Vector3(1, 1, 0);
    makeLine2.p2 = new THREE.Vector3(0, 1, 0);
    const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(line2);

    await contours.remove(line1);
    await contours.remove(line2);
    const makeContour = new JoinCurvesFactory(db, materials, signals);
    makeContour.push(line1);
    makeContour.push(line2);
    const contour = (await makeContour.commit())[0] as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(contour);

    const makeFillet = new ContourFilletFactory(db, materials, signals);
    makeFillet.contour = contour;
    makeFillet.radiuses[0] = 0.1;
    const filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;
    await contours.add(filleted);

    const p1 = contours.update();

    db.removeItem(contour);
    contours.remove(contour);
    const p2 = contours.update();

    // THIS IS KEY: p1 is initiated before p2. It shouldn't matter what order we await.
    // But it does matter unless the .update() uses the db's queue.
    await p2;
    await p1;

    expect(db.find(visual.PlaneInstance).length).toBe(0);
});

test("transactions", async () => {
    await contours.transaction(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;
        await contours.add(line1);

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;
        await contours.add(line2);

        await contours.remove(line1);
        await contours.remove(line2);
        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        const contour = (await makeContour.commit())[0] as visual.SpaceInstance<visual.Curve3D>;
        await contours.add(contour);

        const makeFillet = new ContourFilletFactory(db, materials, signals);
        makeFillet.contour = contour;
        makeFillet.radiuses[0] = 0.1;
        const filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;
        await contours.remove(contour);
        await contours.add(filleted);
    });
});