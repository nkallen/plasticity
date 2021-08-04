import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import { ContourFilletFactory } from "../src/commands/curve/ContourFilletFactory";
import JoinCurvesFactory from "../src/commands/curve/JoinCurvesFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlanarCurveDatabase } from "../src/editor/PlanarCurveDatabase";
import { RegionManager } from "../src/editor/RegionManager";
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let curves: PlanarCurveDatabase;
let regions: RegionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    curves = new PlanarCurveDatabase(db);
    regions = new RegionManager(db, curves);
});

let makeCircle1: CenterCircleFactory;
let makeCircle2: CenterCircleFactory;

beforeEach(() => {
    makeCircle1 = new CenterCircleFactory(db, materials, signals);
    makeCircle2 = new CenterCircleFactory(db, materials, signals);
})

test("race condition", async () => {
    const makeLine1 = new LineFactory(db, materials, signals);
    makeLine1.p1 = new THREE.Vector3();
    makeLine1.p2 = new THREE.Vector3(1, 1, 0);
    const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(line1);

    const makeLine2 = new LineFactory(db, materials, signals);
    makeLine2.p1 = new THREE.Vector3(1, 1, 0);
    makeLine2.p2 = new THREE.Vector3(0, 1, 0);
    const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(line2);

    await curves.remove(line1);
    await curves.remove(line2);
    const makeContour = new JoinCurvesFactory(db, materials, signals);
    makeContour.push(line1);
    makeContour.push(line2);
    const contour = (await makeContour.commit())[0] as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(contour);

    const makeFillet = new ContourFilletFactory(db, materials, signals);
    makeFillet.contour = contour;
    makeFillet.radiuses[0] = 0.1;
    const filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(filleted);

    const p1 = regions.updateCurve(filleted);

    db.removeItem(contour);
    const p2 = regions.updateCurve(contour);
    curves.remove(contour);

    // THIS IS KEY: p1 is initiated before p2. It shouldn't matter what order we await.
    // But it does matter unless the .update() uses the db's queue.
    await p2;
    await p1;

    expect(db.find(visual.PlaneInstance).length).toBe(0);
});

test("two overlapping coplanar circles", async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle1);
    await regions.updateCurve(circle1);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle2);
    await regions.updateCurve(circle2);

    expect(db.find(visual.PlaneInstance).length).toBe(1);
});

test("two parallel circles, not coplanar (i.e., off on Z)", async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle1);
    await regions.updateCurve(circle1);

    makeCircle2.center = new THREE.Vector3(0, 0, 1);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle2);
    await regions.updateCurve(circle2);

    expect(db.find(visual.PlaneInstance).length).toBe(2);
});