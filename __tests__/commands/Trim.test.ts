import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import ContourManager from "../../src/editor/ContourManager";
import TrimFactory from "../../src/commands/curve/TrimFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { PlanarCurveDatabase } from "../../src/editor/PlanarCurveDatabase";
import { RegionManager } from "../../src/editor/RegionManager";
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let curves: PlanarCurveDatabase;
let regions: RegionManager;
let contours: ContourManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    curves = new PlanarCurveDatabase(db);
    regions = new RegionManager(db, curves);
    contours = new ContourManager(db, curves, regions, signals);
})

let circle1: visual.SpaceInstance<visual.Curve3D>;
let circle2: visual.SpaceInstance<visual.Curve3D>;

beforeEach(async () => {
    const makeCircle1 = new CenterCircleFactory(contours, materials, signals);
    const makeCircle2 = new CenterCircleFactory(contours, materials, signals);

    await contours.transaction(async () => {
        makeCircle1.center = new THREE.Vector3(0, 0.25, 0);
        makeCircle1.radius = 1;
        circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeCircle2.center = new THREE.Vector3(0, -0.25, 0);
        makeCircle2.radius = 1;
        circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    });
});


describe(TrimFactory, () => {
    let trim: TrimFactory;

    beforeEach(() => {
        trim = new TrimFactory(contours, materials, signals);
    });

    test("two overlapping circles, ", async () => {
        expect(db.find(visual.PlaneInstance).length).toBe(1);
        expect(db.find(visual.SpaceInstance).length).toBe(6);
        const { fragments } = curves.lookup(circle1);
        const fragment = await fragments[0];
        trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;

        await contours.transaction(async () => {
            await trim.commit();
        });
        expect(db.find(visual.SpaceInstance).length).toBe(5);
        expect(db.find(visual.PlaneInstance).length).toBe(1);
    })
});
