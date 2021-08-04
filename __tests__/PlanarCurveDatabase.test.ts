import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import { ContourFilletFactory } from "../src/commands/curve/ContourFilletFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
import JoinCurvesFactory from "../src/commands/curve/JoinCurvesFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlanarCurveDatabase } from "../src/editor/PlanarCurveDatabase";
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let makeCircle1: CenterCircleFactory;
let makeCircle2: CenterCircleFactory;
let makeCircle3: CenterCircleFactory;
let makeCurve1: CurveFactory;
let makeCurve2: CurveFactory;
let makeCurve3: CurveFactory;
let curves: PlanarCurveDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle1 = new CenterCircleFactory(db, materials, signals);
    makeCircle2 = new CenterCircleFactory(db, materials, signals);
    makeCircle3 = new CenterCircleFactory(db, materials, signals);
    makeCurve1 = new CurveFactory(db, materials, signals);
    makeCurve2 = new CurveFactory(db, materials, signals);
    makeCurve3 = new CurveFactory(db, materials, signals);
    curves = new PlanarCurveDatabase(db);
})

test('adding and deleting a circle', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await curves.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    await curves.remove(circle1);
    await db.removeItem(circle1);
    expect(db.visibleObjects.length).toBe(0);
})

test('three intersecting circles, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await curves.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await curves.add(circle2);
    expect(db.visibleObjects.length).toBe(2 + 4);

    makeCircle3.center = new THREE.Vector3(0, 1.1, 0);
    makeCircle3.radius = 1;
    const circle3 = await makeCircle3.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(6 + 1);

    await curves.add(circle3);
    expect(db.visibleObjects.length).toBe(3 + 8);

    await curves.remove(circle3);
    await db.removeItem(circle3);
    expect(db.visibleObjects.length).toBe(6);

    await curves.remove(circle2);
    await db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(2);
});

test('two non-intersecting circles', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await curves.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 5, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await curves.add(circle2);
    expect(db.visibleObjects.length).toBe(4);

    await curves.remove(circle2);
    await db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(2);
});

test('open curve through circle, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await curves.add(circle);
    expect(db.visibleObjects.length).toBe(2);

    makeCurve1.points.push(new THREE.Vector3(-2, 2, 0))
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
    const curve = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await curves.add(curve);
    expect(db.visibleObjects.length).toBe(2 + 5);

    await curves.remove(curve);
    await db.removeItem(curve);
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

    expect(db.visibleObjects.length).toBe(1);
    expect(userAddedCurve.mock.calls.length).toBe(1);
    expect(objectAdded.mock.calls.length).toBe(1);

    await curves.add(circle1);

    expect(db.visibleObjects.length).toBe(2);
    expect(userAddedCurve.mock.calls.length).toBe(1);
    expect(objectAdded.mock.calls.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;

    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.visibleObjects.length).toBe(3);
    expect(userAddedCurve.mock.calls.length).toBe(2);
    expect(objectAdded.mock.calls.length).toBe(3);

    await curves.add(circle2);

    expect(db.visibleObjects.length).toBe(2 + 4);
    expect(userAddedCurve.mock.calls.length).toBe(2);
    expect(objectAdded.mock.calls.length).toBe(3 + 4);
});

test("removing circles in reverse order works", async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await curves.add(circle1);
    expect(db.visibleObjects.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(3);

    await curves.add(circle2);
    expect(db.visibleObjects.length).toBe(2 + 4);

    await curves.remove(circle1);
    await db.removeItem(circle1);
    expect(db.visibleObjects.length).toBe(2);
})

test("removing lines in reverse order works", async () => {
    const makeCurve1 = new CurveFactory(db, materials, signals);
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, 4, 0));
    const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(curve1);

    expect(db.visibleObjects.length).toBe(2);

    const makeCurve2 = new CurveFactory(db, materials, signals);
    makeCurve2.points.push(new THREE.Vector3(-2, 4, 0));
    makeCurve2.points.push(new THREE.Vector3(0, 5, 0));
    const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(curve2);

    expect(db.visibleObjects.length).toBe(4);

    const makeCurve3 = new CurveFactory(db, materials, signals);
    makeCurve3.points.push(new THREE.Vector3(0, 5, 0));
    makeCurve3.points.push(new THREE.Vector3());
    const curve3 = await makeCurve3.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(curve3);

    expect(db.visibleObjects.length).toBe(6);

    await curves.remove(curve1);
    db.removeItem(curve1);
    expect(db.visibleObjects.length).toBe(4);

    await curves.remove(curve2);
    await db.removeItem(curve2);
    expect(db.visibleObjects.length).toBe(2);

    await curves.remove(curve3);
    await db.removeItem(curve3);
    expect(db.visibleObjects.length).toBe(0);
});

describe("Joints", () => {
    test("joints (two open curves intersect at end/start points)", async () => {
        makeCurve1.points.push(new THREE.Vector3());
        makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(1);
        await curves.add(curve1);
        expect(db.visibleObjects.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
        makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(3);
        await curves.add(curve2);
        expect(db.visibleObjects.length).toBe(4);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;

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

    test("joints (two open curves intersect at start/start points)", async () => {
        makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
        makeCurve1.points.push(new THREE.Vector3());
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(1);
        await curves.add(curve1);
        expect(db.visibleObjects.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
        makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(3);
        await curves.add(curve2);
        expect(db.visibleObjects.length).toBe(4);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;

        expect(joints1.stop).toBeUndefined();
        expect(joints1.start.on1.curve).toBe(curve1);
        expect(joints1.start.on1.t).toBe(0);
        expect(joints1.start.on2.curve).toBe(curve2);
        expect(joints1.start.on2.t).toBe(0);

        expect(joints2.stop).toBeUndefined();
        expect(joints2.start.on1.curve).toBe(curve2);
        expect(joints2.start.on1.t).toBe(0);
        expect(joints2.start.on2.curve).toBe(curve1);
        expect(joints2.start.on2.t).toBe(0);
    });

    test("joints (two open curves intersect at end/end points)", async () => {
        makeCurve1.points.push(new THREE.Vector3());
        makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(1);
        await curves.add(curve1);
        expect(db.visibleObjects.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(3);
        await curves.add(curve2);
        expect(db.visibleObjects.length).toBe(4);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;

        expect(joints1.start).toBeUndefined();
        expect(joints1.stop.on1.curve).toBe(curve1);
        expect(joints1.stop.on1.t).toBe(1);
        expect(joints1.stop.on2.curve).toBe(curve2);
        expect(joints1.stop.on2.t).toBe(1);

        expect(joints2.start).toBeUndefined();
        expect(joints2.stop.on1.curve).toBe(curve2);
        expect(joints2.stop.on1.t).toBe(1);
        expect(joints2.stop.on2.curve).toBe(curve1);
        expect(joints2.stop.on2.t).toBe(1);
    });

    test("joints (triangle with inconsistent winding order)", async () => {
        makeCurve1.points.push(new THREE.Vector3());
        makeCurve1.points.push(new THREE.Vector3(1, 1, 0));
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(1);
        await curves.add(curve1);
        expect(db.visibleObjects.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(1, 1, 0));
        makeCurve2.points.push(new THREE.Vector3(0, 1, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(3);
        await curves.add(curve2);
        expect(db.visibleObjects.length).toBe(4);

        makeCurve3.points.push(new THREE.Vector3());
        makeCurve3.points.push(new THREE.Vector3(0, 1, 0));
        const curve3 = await makeCurve3.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.visibleObjects.length).toBe(5);
        await curves.add(curve3);
        expect(db.visibleObjects.length).toBe(6);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;
        const joints3 = curves.lookup(curve3).joints;

        expect(joints1.start.on1.curve).toBe(curve1);
        expect(joints1.start.on1.t).toBe(0);
        expect(joints1.start.on2.curve).toBe(curve3);
        expect(joints1.start.on2.t).toBe(0);
        expect(joints1.stop.on1.curve).toBe(curve1);
        expect(joints1.stop.on1.t).toBe(1);
        expect(joints1.stop.on2.curve).toBe(curve2);
        expect(joints1.stop.on2.t).toBe(0);

        expect(joints2.start.on1.curve).toBe(curve2);
        expect(joints2.start.on1.t).toBe(0);
        expect(joints2.start.on2.curve).toBe(curve1);
        expect(joints2.start.on2.t).toBe(1);
        expect(joints2.stop.on1.curve).toBe(curve2);
        expect(joints2.stop.on1.t).toBe(1);
        expect(joints2.stop.on2.curve).toBe(curve3);
        expect(joints2.stop.on2.t).toBe(1);

        expect(joints3.start.on1.curve).toBe(curve3);
        expect(joints3.start.on1.t).toBe(0);
        expect(joints3.start.on2.curve).toBe(curve1);
        expect(joints3.start.on2.t).toBe(0);
        expect(joints3.stop.on1.curve).toBe(curve3);
        expect(joints3.stop.on1.t).toBe(1);
        expect(joints3.stop.on2.curve).toBe(curve2);
        expect(joints3.stop.on2.t).toBe(1);
    });
})