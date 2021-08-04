import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import ContourManager from '../src/commands/ContourManager';
import { ContourFilletFactory } from "../src/commands/curve/ContourFilletFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
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
let makeCircle1: CenterCircleFactory;
let makeCircle2: CenterCircleFactory;
let makeCircle3: CenterCircleFactory;
let makeCurve1: CurveFactory;
let makeCurve2: CurveFactory;
let makeCurve3: CurveFactory;
let curves: PlanarCurveDatabase;
let regions: RegionManager;
let contours: ContourManager;
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
    regions = new RegionManager(db, curves);
    contours = new ContourManager(curves, regions, signals);
})

test("transactions batch add and removes", async () => {
    let added = 0, removed = 0;
    signals.objectAdded.add(() => added++);
    signals.objectRemoved.add(() => removed++);

    await contours.transaction(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        const contour = (await makeContour.commit())[0] as visual.SpaceInstance<visual.Curve3D>;

        const makeFillet = new ContourFilletFactory(db, materials, signals);
        makeFillet.contour = contour;
        makeFillet.radiuses[0] = 0.1;
        await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;
    });

    expect(db.find(visual.SpaceInstance).length).toBe(2);
    expect(db.find(visual.PlaneInstance).length).toBe(0);
    expect(added).toBe(5);
    expect(removed).toBe(3);
});

// NOTE: this test is JUST DOCUMENTATION -- documenting how transactions work when NOT used.
test("when not using aggregated transactions, you get a lot more adds/deletes", async () => {
    let added = 0, removed = 0;
    signals.objectAdded.add(() => added++);
    signals.objectRemoved.add(() => removed++);

    let line1, line2, contour;
    await contours.transaction(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
    await contours.transaction(async () => {
        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
    await contours.transaction(async () => {
        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        contour = (await makeContour.commit())[0] as visual.SpaceInstance<visual.Curve3D>;
    });
    await contours.transaction(async () => {
        const makeFillet = new ContourFilletFactory(db, materials, signals);
        makeFillet.contour = contour;
        makeFillet.radiuses[0] = 0.1;
        await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;
    });

    expect(db.find(visual.SpaceInstance).length).toBe(2);
    expect(db.find(visual.PlaneInstance).length).toBe(0);
    expect(added).toBe(9);
    expect(removed).toBe(7);
});

test("two overlapping coplanar circles, adding and removing creates the right regions", async () => {
    let circle1, circle2;
    await contours.transaction(async () => {
        makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
        makeCircle1.radius = 1;
        circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
    expect(db.find(visual.PlaneInstance).length).toBe(1);

    await contours.transaction(async () => {
        makeCircle2.center = new THREE.Vector3(0, 0, 0);
        makeCircle2.radius = 1;
        circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
    expect(db.find(visual.PlaneInstance).length).toBe(1);

    await contours.transaction(async () => {
        db.removeItem(circle2);
    });
    expect(db.find(visual.PlaneInstance).length).toBe(1);

    await contours.transaction(async () => {
        db.removeItem(circle1);
    });
    expect(db.find(visual.PlaneInstance).length).toBe(0);
});