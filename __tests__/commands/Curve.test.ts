import * as THREE from "three";
import CurveFactory from '../../src/commands/curve/CurveFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let makeCurve: CurveFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeCurve = new CurveFactory(db, materials, signals);
})

describe('update', () => {
    test('creates a line', () => {
        makeCurve.points.push(new THREE.Vector3());
        makeCurve.points.push(new THREE.Vector3(1, 1, 0));
        makeCurve.points.push(new THREE.Vector3(2, -1, 0));
        makeCurve.update();
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        makeCurve.points.push(new THREE.Vector3());
        makeCurve.points.push(new THREE.Vector3(1, 1, 0));
        makeCurve.points.push(new THREE.Vector3(2, -1, 0));
        const item = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(item).toBeInstanceOf(visual.SpaceInstance);
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
    })
})