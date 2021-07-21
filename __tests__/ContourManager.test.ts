import * as THREE from "three";
import { CircleFactory } from "../src/commands/circle/CircleFactory";
import ContourManager from '../src/commands/ContourManager';
import { EditorSignals } from '../src/editor/Editor';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let makeCircle1: CircleFactory;
let makeCircle2: CircleFactory;
let makeCircle3: CircleFactory;
let contours: ContourManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle1 = new CircleFactory(db, materials, signals);
    makeCircle2 = new CircleFactory(db, materials, signals);
    makeCircle3 = new CircleFactory(db, materials, signals);
    contours = new ContourManager(db, signals);
})

test('foo', async () => {
    makeCircle1.center = new THREE.Vector3(0, -1.1, 0);
    makeCircle1.radius = 1;
    const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(1);

    await contours.add(circle1);
    expect(db.visibleObjects.length).toBe(1);

    makeCircle2.center = new THREE.Vector3(0, 0, 0);
    makeCircle2.radius = 1;
    const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(2);

    await contours.add(circle2);
    expect(db.visibleObjects.length).toBe(2 + 4);

    makeCircle3.center = new THREE.Vector3(0, 1.1, 0);
    makeCircle3.radius = 1;
    const circle3 = await makeCircle3.commit() as visual.SpaceInstance<visual.Curve3D>;
    expect(db.visibleObjects.length).toBe(2 + 4 + 1);

    await contours.add(circle3);
    expect(db.visibleObjects.length).toBe(3 + 8);
});
