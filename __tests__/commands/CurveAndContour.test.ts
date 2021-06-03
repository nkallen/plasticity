import * as THREE from "three";
import CurveAndContourFactory from '../../src/commands/curve/CurveAndContourFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeContour: CurveAndContourFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeContour = new CurveAndContourFactory(db, materials, signals);
})

describe('push & commit', () => {
    test('multiple curves, many points', async () => {
        for (var i = 0; i < 3; i++) {
            makeContour.points.push(new THREE.Vector3(i,i,i));
        }
        makeContour.push();
        for (var i = 3; i < 6; i++) {
            makeContour.points.push(new THREE.Vector3(i,i,i));
        }
        const contour = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(contour);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(2.5, 2.5, 2.5));
    })
})

describe('undo', () => {
    test('when one curve, many points', async () => {
        for (var i = 0; i < 3; i++) {
            makeContour.points.push(new THREE.Vector3(i,i,i));
        }
        makeContour.undo();
        const contour = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(contour);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
    })

    test('when many curves and one point', async () => {
        for (var i = 0; i < 3; i++) {
            makeContour.points.push(new THREE.Vector3(i,i,i));
        }
        makeContour.push();
        makeContour.undo();
        const contour = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(contour);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
})