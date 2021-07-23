import * as THREE from "three";
import { CircleFactory } from "../src/commands/circle/CircleFactory";
import ContourManager from '../src/commands/ContourManager';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
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
    signals = new EditorSignals();
    const silentSignals = new EditorSignals(); // signals >/dev/null because for tests we want to explicitly invoke add()/remove()
    db = new GeometryDatabase(materials, silentSignals);
    makeCircle1 = new CircleFactory(db, materials, signals);
    makeCircle2 = new CircleFactory(db, materials, signals);
    makeCircle3 = new CircleFactory(db, materials, signals);
    contours = new ContourManager(db, signals);
})

test('three intersecting circles, added then deleted', async () => {
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
    expect(db.visibleObjects.length).toBe(6 + 1);

    await contours.add(circle3);
    expect(db.visibleObjects.length).toBe(3 + 8);

    await contours.remove(circle3);
    db.removeItem(circle3);
    expect(db.visibleObjects.length).toBe(6);

    await contours.remove(circle2);
    db.removeItem(circle2);
    expect(db.visibleObjects.length).toBe(1);
});
