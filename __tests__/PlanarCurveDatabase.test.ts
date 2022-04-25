import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
import { CornerRectangleFactory } from '../src/commands/rect/RectangleFactory';
import { PlanarCurveDatabase } from "../src/editor/curves/PlanarCurveDatabase";
import { Agent } from '../src/editor/DatabaseLike';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import { SolidCopier } from "../src/editor/SolidCopier";
import * as visual from '../src/visual_model/VisualModel';
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
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    curves = new PlanarCurveDatabase(db);
});

beforeEach(() => {
    makeCircle1 = new CenterCircleFactory(db, materials, signals);
    makeCircle2 = new CenterCircleFactory(db, materials, signals);
    makeCircle3 = new CenterCircleFactory(db, materials, signals);
    makeCurve1 = new CurveFactory(db, materials, signals);
    makeCurve2 = new CurveFactory(db, materials, signals);
    makeCurve3 = new CurveFactory(db, materials, signals);
})

afterEach(() => {
    curves.validate();
})

test('adding and deleting a circle', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle1);
    expect(db.items.length).toBe(2);

    await curves.remove(circle1);
    await db.removeItem(circle1);
    expect(db.items.length).toBe(0);
})

test('three intersecting circles, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle1);
    expect(db.items.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(3);

    await curves.add(circle2);
    expect(db.items.length).toBe(2 + 4);

    makeCircle3.center = new THREE.Vector3(0, 1.1, 0);
    makeCircle3.radius = 1;
    const circle3 = await makeCircle3.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(6 + 1);

    await curves.add(circle3);
    expect(db.items.length).toBe(3 + 8);

    await curves.remove(circle3);
    await db.removeItem(circle3);
    expect(db.items.length).toBe(6);

    await curves.remove(circle2);
    await db.removeItem(circle2);
    expect(db.items.length).toBe(2);
});

test('two non-intersecting circles', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle1);
    expect(db.items.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 5, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(3);

    await curves.add(circle2);
    expect(db.items.length).toBe(4);

    await curves.remove(circle2);
    await db.removeItem(circle2);
    expect(db.items.length).toBe(2);
});

test('two circles that intersect in 2d but not 3d', async () => {
    makeCircle1.center = new THREE.Vector3(-0.25, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle1);
    expect(db.items.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0.25, 0, 1);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(3);

    await curves.add(circle2);
    expect(db.items.length).toBe(4);

    await curves.remove(circle2);
    await db.removeItem(circle2);
    expect(db.items.length).toBe(2);
});

test('the newly created curves have right placement', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 1);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle1);
    expect(db.items.length).toBe(2);

    expect(db.items[0].view).toBeInstanceOf(visual.SpaceInstance);
    expect(db.items[1].view).toBeInstanceOf(visual.SpaceInstance);

    const bbox = new THREE.Box3();
    const center = new THREE.Vector3();

    bbox.setFromObject(db.items[0].view);
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));

    bbox.setFromObject(db.items[1].view);
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
});

test('open curve through circle, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle);
    expect(db.items.length).toBe(2);

    makeCurve1.points.push(new THREE.Vector3(-2, 2, 0))
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
    const curve = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(3);

    await curves.add(curve);
    expect(db.items.length).toBe(2 + 5);

    await curves.remove(curve);
    await db.removeItem(curve);
    expect(db.items.length).toBe(2);
});

test('userAddedCurve event is dispatched only when the user interacts with the db, not when fragments are automatically created; other events behave the same in both cases', async () => {
    let userAddedObject = 0, robotAddedObject = 0;
    const objectAdded = ([item, agent]: [visual.Item, Agent]) => {
        if (agent === 'user') userAddedObject++;
        else robotAddedObject++;
    }
    signals.objectAdded.add(objectAdded);

    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;

    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.items.length).toBe(1);
    expect(userAddedObject).toBe(1);
    expect(robotAddedObject).toBe(0);

    await curves.add(circle1);

    expect(db.items.length).toBe(2);
    expect(userAddedObject).toBe(1);
    expect(robotAddedObject).toBe(1);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;

    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.items.length).toBe(3);
    expect(userAddedObject).toBe(2);
    expect(robotAddedObject).toBe(1);

    await curves.add(circle2);

    expect(db.items.length).toBe(2 + 4);
    expect(userAddedObject).toBe(2);
    expect(robotAddedObject).toBe(5);
});

test("removing circles in reverse order works", async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(1);

    await curves.add(circle1);
    expect(db.items.length).toBe(2);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.items.length).toBe(3);

    await curves.add(circle2);
    expect(db.items.length).toBe(2 + 4);

    await curves.remove(circle1);
    await db.removeItem(circle1);
    expect(db.items.length).toBe(2);
})

test("removing lines in reverse order works", async () => {
    const makeCurve1 = new CurveFactory(db, materials, signals);
    makeCurve1.points.push(new THREE.Vector3());
    makeCurve1.points.push(new THREE.Vector3(-2, 4, 0));
    const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(curve1);

    expect(db.items.length).toBe(2);

    const makeCurve2 = new CurveFactory(db, materials, signals);
    makeCurve2.points.push(new THREE.Vector3(-2, 4, 0));
    makeCurve2.points.push(new THREE.Vector3(0, 5, 0));
    const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(curve2);

    expect(db.items.length).toBe(4);

    const makeCurve3 = new CurveFactory(db, materials, signals);
    makeCurve3.points.push(new THREE.Vector3(0, 5, 0));
    makeCurve3.points.push(new THREE.Vector3());
    const curve3 = await makeCurve3.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(curve3);

    expect(db.items.length).toBe(6);

    await curves.remove(curve1);
    db.removeItem(curve1);
    expect(db.items.length).toBe(4);

    await curves.remove(curve2);
    await db.removeItem(curve2);
    expect(db.items.length).toBe(2);

    await curves.remove(curve3);
    await db.removeItem(curve3);
    expect(db.items.length).toBe(0);
});

test("simple polylines don't error", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Polyline3D;
    makeLine.points.push(new THREE.Vector3());
    makeLine.points.push(new THREE.Vector3(-2, 4, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.items.length).toBe(1);
    await curves.add(line);
    expect(db.items.length).toBe(2);
});

test("polylines are broken into their constituent segments", async () => {
    const makeLine = new CurveFactory(db, materials, signals);
    makeLine.type = c3d.SpaceType.Polyline3D;
    makeLine.points.push(new THREE.Vector3());
    makeLine.points.push(new THREE.Vector3(-2, 4, 0));
    makeLine.points.push(new THREE.Vector3(-4, -4, 0));
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.items.length).toBe(1);
    await curves.add(line);
    expect(db.items.length).toBe(3);
});

test("closed polylines are borken into their constituent segments", async () => {
    const makeRectangle = new CornerRectangleFactory(db, materials, signals);
    makeRectangle.p1 = new THREE.Vector3(-1, -1, -1);
    makeRectangle.p2 = new THREE.Vector3(1, 1, 1);
    const rectangle = await makeRectangle.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(db.items.length).toBe(1);
    await curves.add(rectangle);
    expect(db.items.length).toBe(5);
});

describe("Joints", () => {
    test("joints (two open curves intersect at end/start points)", async () => {
        makeCurve1.points.push(new THREE.Vector3());
        makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(1);
        await curves.add(curve1);
        expect(db.items.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
        makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(3);
        await curves.add(curve2);
        expect(db.items.length).toBe(4);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;

        expect(joints1.start).toBeUndefined();
        expect(joints1.stop!.on1.id).toBe(curve1.simpleName);
        expect(joints1.stop!.on1.t).toBe(1);
        expect(joints1.stop!.on2.id).toBe(curve2.simpleName);
        expect(joints1.stop!.on2.t).toBe(0);

        expect(joints2.stop).toBeUndefined();
        expect(joints2.start!.on1.id).toBe(curve2.simpleName);
        expect(joints2.start!.on1.t).toBe(0);
        expect(joints2.start!.on2.id).toBe(curve1.simpleName);
        expect(joints2.start!.on2.t).toBe(1);
    });

    test("joints (two open curves intersect at start/start points)", async () => {
        makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
        makeCurve1.points.push(new THREE.Vector3());
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(1);
        await curves.add(curve1);
        expect(db.items.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
        makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(3);
        await curves.add(curve2);
        expect(db.items.length).toBe(4);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;

        expect(joints1.stop).toBeUndefined();
        expect(joints1.start!.on1.id).toBe(curve1.simpleName);
        expect(joints1.start!.on1.t).toBe(0);
        expect(joints1.start!.on2.id).toBe(curve2.simpleName);
        expect(joints1.start!.on2.t).toBe(0);

        expect(joints2.stop).toBeUndefined();
        expect(joints2.start!.on1.id).toBe(curve2.simpleName);
        expect(joints2.start!.on1.t).toBe(0);
        expect(joints2.start!.on2.id).toBe(curve1.simpleName);
        expect(joints2.start!.on2.t).toBe(0);
    });

    test("joints (two open curves intersect at end/end points)", async () => {
        makeCurve1.points.push(new THREE.Vector3());
        makeCurve1.points.push(new THREE.Vector3(-2, -2, 0));
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(1);
        await curves.add(curve1);
        expect(db.items.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve2.points.push(new THREE.Vector3(-2, -2, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(3);
        await curves.add(curve2);
        expect(db.items.length).toBe(4);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;

        expect(joints1.start).toBeUndefined();
        expect(joints1.stop!.on1.id).toBe(curve1.simpleName);
        expect(joints1.stop!.on1.t).toBe(1);
        expect(joints1.stop!.on2.id).toBe(curve2.simpleName);
        expect(joints1.stop!.on2.t).toBe(1);

        expect(joints2.start).toBeUndefined();
        expect(joints2.stop!.on1.id).toBe(curve2.simpleName);
        expect(joints2.stop!.on1.t).toBe(1);
        expect(joints2.stop!.on2.id).toBe(curve1.simpleName);
        expect(joints2.stop!.on2.t).toBe(1);
    });

    test("joints (triangle with inconsistent winding order)", async () => {
        makeCurve1.points.push(new THREE.Vector3());
        makeCurve1.points.push(new THREE.Vector3(1, 1, 0));
        const curve1 = await makeCurve1.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(1);
        await curves.add(curve1);
        expect(db.items.length).toBe(2);

        makeCurve2.points.push(new THREE.Vector3(1, 1, 0));
        makeCurve2.points.push(new THREE.Vector3(0, 1, 0));
        const curve2 = await makeCurve2.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(3);
        await curves.add(curve2);
        expect(db.items.length).toBe(4);

        makeCurve3.points.push(new THREE.Vector3());
        makeCurve3.points.push(new THREE.Vector3(0, 1, 0));
        const curve3 = await makeCurve3.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(db.items.length).toBe(5);
        await curves.add(curve3);
        expect(db.items.length).toBe(6);

        const joints1 = curves.lookup(curve1).joints;
        const joints2 = curves.lookup(curve2).joints;
        const joints3 = curves.lookup(curve3).joints;

        expect(joints1.start!.on1.id).toBe(curve1.simpleName);
        expect(joints1.start!.on1.t).toBe(0);
        expect(joints1.start!.on2.id).toBe(curve3.simpleName);
        expect(joints1.start!.on2.t).toBe(0);
        expect(joints1.stop!.on1.id).toBe(curve1.simpleName);
        expect(joints1.stop!.on1.t).toBe(1);
        expect(joints1.stop!.on2.id).toBe(curve2.simpleName);
        expect(joints1.stop!.on2.t).toBe(0);

        expect(joints2.start!.on1.id).toBe(curve2.simpleName);
        expect(joints2.start!.on1.t).toBe(0);
        expect(joints2.start!.on2.id).toBe(curve1.simpleName);
        expect(joints2.start!.on2.t).toBe(1);
        expect(joints2.stop!.on1.id).toBe(curve2.simpleName);
        expect(joints2.stop!.on1.t).toBe(1);
        expect(joints2.stop!.on2.id).toBe(curve3.simpleName);
        expect(joints2.stop!.on2.t).toBe(1);

        expect(joints3.start!.on1.id).toBe(curve3.simpleName);
        expect(joints3.start!.on1.t).toBe(0);
        expect(joints3.start!.on2.id).toBe(curve1.simpleName);
        expect(joints3.start!.on2.t).toBe(0);
        expect(joints3.stop!.on1.id).toBe(curve3.simpleName);
        expect(joints3.stop!.on1.t).toBe(1);
        expect(joints3.stop!.on2.id).toBe(curve2.simpleName);
        expect(joints3.stop!.on2.t).toBe(1);
    });
});

describe("findWithSamePlacement", () => {
    test("two coplanar circles", async () => {
        makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
        makeCircle1.radius = 1;
        const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
        await curves.add(circle1);

        makeCircle2.center = new THREE.Vector3(0, 0, 0);
        makeCircle2.radius = 1;
        const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
        await curves.add(circle2);

        const info = curves.lookup(circle1);
        const coplanar = curves.findWithSamePlacement(info.placement);

        expect(coplanar.length).toBe(2);
    });

    test("two parallel circles, not coplanar (i.e., off on Z)", async () => {
        makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
        makeCircle1.radius = 1;
        const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
        await curves.add(circle1);

        makeCircle2.center = new THREE.Vector3(0, 0, 1);
        makeCircle2.radius = 1;
        const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
        await curves.add(circle2);

        const info = curves.lookup(circle1);
        const coplanar = curves.findWithSamePlacement(info.placement);

        expect(coplanar.length).toBe(1);
    });
});
