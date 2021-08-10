import * as THREE from "three";
import CylinderFactory from "../../src/commands/cylinder/CylinderFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let makeCylinder: CylinderFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeCylinder = new CylinderFactory(db, materials, signals);
})

test('upright cylinder', async () => {
    makeCylinder.base = new THREE.Vector3();
    makeCylinder.radius = new THREE.Vector3(1, 0, 0);
    makeCylinder.height = new THREE.Vector3(0, 0, 10);
    const item = await makeCylinder.commit() as visual.SpaceItem;
    const bbox = new THREE.Box3().setFromObject(item);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 5));
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 10));
});

test('sideways that starts off vertical but ends sideways X cylinder', async () => {
    makeCylinder.base = new THREE.Vector3();
    makeCylinder.radius = new THREE.Vector3(1, 0, 0); // radius set as if we were going in Z
    makeCylinder.height = new THREE.Vector3(10, 0, 0); // but actualyl we turn towards X
    const item = await makeCylinder.commit() as visual.SpaceItem;
    const bbox = new THREE.Box3().setFromObject(item);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(5, 0, 0));
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, -1));
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(10, 1, 1));
});

test('sideways that starts off vertical but ends sideways Y cylinder', async () => {
    makeCylinder.base = new THREE.Vector3();
    makeCylinder.radius = new THREE.Vector3(1, 0, 0); // radius set as if we were going in Z
    makeCylinder.height = new THREE.Vector3(0, 10, 0); // but actualyl we turn towards X
    const item = await makeCylinder.commit() as visual.SpaceItem;
    const bbox = new THREE.Box3().setFromObject(item);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0, 5, 0));
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, -1));
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 10, 1));
});

