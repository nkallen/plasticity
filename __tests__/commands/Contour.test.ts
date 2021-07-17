import * as THREE from "three";
import ContourFactory from '../../src/commands/curve/ContourFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { EditorSignals } from '../../src/editor/Editor';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeContour: ContourFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeContour = new ContourFactory(db, materials, signals);
})

describe('update', () => {
    test('moves the visual object', async () => {
        for (var i = 0; i < 3; i++) {
            const makeLine = new LineFactory(db, materials, signals);
            makeLine.p1 = new THREE.Vector3(i-1,i-1,i-1);
            makeLine.p2 = new THREE.Vector3(i,i,i);
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            makeContour.curves.push(line);
            makeContour.update();
        }
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        for (var i = 0; i < 3; i++) {
            const makeLine = new LineFactory(db, materials, signals);
            makeLine.p1 = new THREE.Vector3(i-1,i-1,i-1);
            makeLine.p2 = new THREE.Vector3(i,i,i);
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
            makeContour.curves.push(line);
        }
        const contour = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(contour);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
    })
})