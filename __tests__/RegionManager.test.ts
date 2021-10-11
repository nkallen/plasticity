import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import { ContourFilletFactory } from "../src/commands/curve/ContourFilletFactory";
import JoinCurvesFactory from "../src/commands/curve/JoinCurvesFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { PlanarCurveDatabase } from "../src/editor/curves/PlanarCurveDatabase";
import { RegionManager } from "../src/editor/curves/RegionManager";
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
    curves = new PlanarCurveDatabase(db, materials, signals);
    regions = new RegionManager(db, curves);
});

let makeCircle1: CenterCircleFactory;
let makeCircle2: CenterCircleFactory;

beforeEach(() => {
    makeCircle1 = new CenterCircleFactory(db, materials, signals);
    makeCircle2 = new CenterCircleFactory(db, materials, signals);
})

test("two overlapping coplanar circles", async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle1);
    const placement1 = curves.lookup(circle1).placement;

    await regions.updatePlacement(placement1);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle2);
    const placement2 = curves.lookup(circle1).placement;
    await regions.updatePlacement(placement2);

    expect(db.find(visual.PlaneInstance).length).toBe(1);

    await curves.remove(circle2);
    await regions.updatePlacement(placement2);

    expect(db.find(visual.PlaneInstance).length).toBe(1);

    await curves.remove(circle1);
    await regions.updatePlacement(placement1);

    expect(db.find(visual.PlaneInstance).length).toBe(0);
});

test("two parallel circles, not coplanar (i.e., off on Z)", async () => {
    makeCircle1.center = new THREE.Vector3(0, 0, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle1);
    const placement1 = curves.lookup(circle1).placement;
    await regions.updatePlacement(placement1);

    makeCircle2.center = new THREE.Vector3(0, 0, 1);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    await curves.add(circle2);
    const placement2 = curves.lookup(circle2).placement;
    await regions.updatePlacement(placement2);

    expect(db.find(visual.PlaneInstance).length).toBe(2);

    await curves.remove(circle2);
    await regions.updatePlacement(placement2);

    expect(db.find(visual.PlaneInstance).length).toBe(1);

    await curves.remove(circle1);
    await regions.updatePlacement(placement1);

    expect(db.find(visual.PlaneInstance).length).toBe(0);
});