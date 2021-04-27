import * as THREE from "three";
import LineFactory from "../../src/commands/line/LineFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeLine: LineFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeLine = new LineFactory(db, materials, signals);
})

describe('update', () => {
    test('creates a line', () => {
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        makeLine.update();
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        const item = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(item).toBeInstanceOf(visual.SpaceInstance);
        expect(item.underlying).toBeInstanceOf(visual.Curve3D);
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })
})