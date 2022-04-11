import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { CrossPointDatabase } from "../../src/editor/curves/CrossPointDatabase";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { SolidCopier } from "../../src/editor/SolidCopier";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let makeCircle1: CenterCircleFactory;
let makeCircle2: CenterCircleFactory;
let makeCircle3: CenterCircleFactory;
let makeCurve1: CurveFactory;
let makeCurve2: CurveFactory;
let makeCurve3: CurveFactory;
let crosses: CrossPointDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    crosses = new CrossPointDatabase();
});

afterEach(() => {
    crosses.validate();
})

beforeEach(() => {
    makeCircle1 = new CenterCircleFactory(db, materials, signals);
    makeCircle2 = new CenterCircleFactory(db, materials, signals);
    makeCircle3 = new CenterCircleFactory(db, materials, signals);
    makeCurve1 = new CurveFactory(db, materials, signals);
    makeCurve2 = new CurveFactory(db, materials, signals);
    makeCurve3 = new CurveFactory(db, materials, signals);
})

test("two intersecting circles, add & remove", async () => {
    makeCircle1.center = new THREE.Vector3(0, -0.1, 0);
    makeCircle1.radius = 1;
    const circle1 = (await makeCircle1.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    crosses.add(0, circle1);
    expect(crosses.crosses.size).toBe(0)

    makeCircle2.center = new THREE.Vector3(0, 0.1, 0);
    makeCircle2.radius = 1;
    const circle2 = (await makeCircle2.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

    crosses.add(1, circle2);
    expect(crosses.crosses.size).toBe(2);

    crosses.remove(1);
    expect(crosses.crosses.size).toBe(0);
});

test("two intersecting circles, add & remove in reverse order", async () => {
    makeCircle1.center = new THREE.Vector3(0, -0.1, 0);
    makeCircle1.radius = 1;
    const circle1 = (await makeCircle1.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    crosses.add(0, circle1);
    expect(crosses.crosses.size).toBe(0)

    makeCircle2.center = new THREE.Vector3(0, 0.1, 0);
    makeCircle2.radius = 1;
    const circle2 = (await makeCircle2.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

    crosses.add(1, circle2);
    expect(crosses.crosses.size).toBe(2);

    crosses.remove(0);
    expect(crosses.crosses.size).toBe(0);

    crosses.remove(1);
    expect(crosses.crosses.size).toBe(0);
});

test("two intersecting circles, add & remove in reverse order but with heirarchical dbs", async () => {
    makeCircle1.center = new THREE.Vector3(0, -0.1, 0);
    makeCircle1.radius = 1;
    const circle1 = (await makeCircle1.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    crosses.add(0, circle1);
    expect(crosses.crosses.size).toBe(0)

    makeCircle2.center = new THREE.Vector3(0, 0.1, 0);
    makeCircle2.radius = 1;
    const circle2 = (await makeCircle2.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

    const curves_wrapped = new CrossPointDatabase(crosses);

    curves_wrapped.add(1, circle2);
    expect(crosses.crosses.size).toBe(0);
    expect(curves_wrapped.crosses.size).toBe(2);

    crosses.remove(0);
    expect(crosses.crosses.size).toBe(0);
});

test('two non-intersecting circles', async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = (await makeCircle1.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

    crosses.add(0, circle1);
    expect(crosses.crosses.size).toBe(0);

    makeCircle2.center = new THREE.Vector3(0, 5, 0);
    makeCircle2.radius = 1;
    const circle2 = (await makeCircle2.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    expect(crosses.crosses.size).toBe(0);

    crosses.add(1, circle2);
    expect(crosses.crosses.size).toBe(0);

    crosses.remove(1);
    expect(crosses.crosses.size).toBe(0);
});

test('three intersecting circles, added then deleted', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = (await makeCircle1.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    expect(crosses.crosses.size).toBe(0);

    crosses.add(0, circle1);
    expect(crosses.crosses.size).toBe(0);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = (await makeCircle2.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    expect(crosses.crosses.size).toBe(0);

    crosses.add(1, circle2);
    expect(crosses.crosses.size).toBe(2);

    makeCircle3.center = new THREE.Vector3(0, 1.1, 0);
    makeCircle3.radius = 1;
    const circle3 = (await makeCircle3.calculate()).GetSpaceItem()!.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);
    expect(crosses.crosses.size).toBe(2);

    crosses.add(2, circle3);
    expect(crosses.crosses.size).toBe(4);

    crosses.remove(2);
    expect(crosses.crosses.size).toBe(2);

    crosses.remove(1);
    expect(crosses.crosses.size).toBe(0);
});