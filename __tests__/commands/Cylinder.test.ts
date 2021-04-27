import * as THREE from "three";
import CylinderFactory from "../../src/commands/cylinder/CylinderFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeCylinder: CylinderFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeCylinder = new CylinderFactory(db, materials, signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
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
    })
})