import * as THREE from "three";
import ChangePointFactory from "../../src/commands/control_point/ChangePointFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let changePoint: ChangePointFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;
let curve: visual.SpaceInstance<visual.Curve3D>;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

describe('Polycurve', () => {
    beforeEach(async() => {
        const makeCurve = new CurveFactory(db, materials, signals);
        changePoint = new ChangePointFactory(db, materials, signals);
    
        makeCurve.points.push(new THREE.Vector3());
        makeCurve.points.push(new THREE.Vector3(1, 1, 1));
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
    
        const bbox = new THREE.Box3().setFromObject(curve);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    });

    test('invokes the appropriate c3d commands', async () => {
        changePoint.controlPoint = curve.underlying.points.get(0);
        changePoint.instance = curve;
        changePoint.delta = new THREE.Vector3(-2, -2, 0);
        const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(newCurve);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
    })
})


describe('linesegment', () => {
    beforeEach(async() => {
        const makeLine = new LineFactory(db, materials, signals);
        changePoint = new ChangePointFactory(db, materials, signals);
    
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 1);

        curve = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
    
        const bbox = new THREE.Box3().setFromObject(curve);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });

    test('invokes the appropriate c3d commands', async () => {
        changePoint.controlPoint = curve.underlying.points.get(0);
        changePoint.instance = curve;
        changePoint.delta = new THREE.Vector3(-1, -1, -1);
        const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(newCurve);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
})