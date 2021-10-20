import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { RemovePointFactory } from "../../src/commands/control_point/ControlPointFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { NoOpError } from "../../src/commands/GeometryFactory";
import { ModifyContourPointFactory } from "../../src/commands/modify_contour/ModifyContourPointFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let changePoint: ModifyContourPointFactory;
let removePoint: RemovePointFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;
let curve: visual.SpaceInstance<visual.Curve3D>;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

const center = new THREE.Vector3();
const bbox = new THREE.Box3();

describe(ModifyContourPointFactory, () => {
    describe('Polyline3D', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;
            changePoint = new ModifyContourPointFactory(db, materials, signals);

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });

        test('controlPointInfo', async () => {
            const contour = await changePoint.prepare(curve);
            changePoint.controlPoint = 0;
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const info = changePoint.controlPointInfo;
            expect(info.length).toBe(3);
            expect(info[0].origin).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(info[0].segmentIndex).toBe(0)
            expect(info[0].limit).toBe(1)
            expect(info[1].origin).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(info[1].segmentIndex).toBe(1)
            expect(info[1].limit).toBe(1)
            expect(info[2].origin).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            expect(info[2].segmentIndex).toBe(1)
            expect(info[2].limit).toBe(2)
        })

        test('moving first point', async () => {
            const contour = await changePoint.prepare(curve);
            changePoint.controlPoint = 0;
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 2, 0));
            // expect(db.visibleObjects.length).toBe(1);
        });

        test('moving last point', async () => {
            const contour = await changePoint.prepare(curve);
            changePoint.controlPoint = 2;
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-1, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-4, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            // expect(db.visibleObjects.length).toBe(1);
        });

        test('moving middle point', async () => {
            const contour = await changePoint.prepare(curve);
            changePoint.controlPoint = 1;
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, 0, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            // expect(db.visibleObjects.length).toBe(1);
        })

        // TEST CLOSED TRIANGLE moves beginning and ending
    })

    // test('moving two points', async () => {
    //     changePoint.controlPoints = [curve.underlying.points.findByIndex(0), curve.underlying.points.findByIndex(1)];
    //     changePoint.move = new THREE.Vector3(-2, -2, 0);
    //     const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;
    //     const bbox = new THREE.Box3().setFromObject(newCurve);
    //     const center = new THREE.Vector3();
    //     bbox.getCenter(center);
    //     expect(center).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
    //     expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-4, -2, 0));
    //     expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    //     expect(db.visibleObjects.length).toBe(1);
    // })

    // test('originalPosition', async () => {
    //     changePoint.controlPoints = [curve.underlying.points.findByIndex(0), curve.underlying.points.findByIndex(1)];
    //     expect(changePoint.originalPosition).toApproximatelyEqual(new THREE.Vector3(-0.5, 1, 0));
    // })

    // test('with no move vector it doesn\'t error', async () => {
    //     changePoint.controlPoints = [curve.underlying.points.findByIndex(0)];
    //     await expect(changePoint.commit()).rejects.toThrow(NoOpError);
    // })

    // test('moving an arc/circle', async () => {
    //     const makeCircle = new CenterCircleFactory(db, materials, signals);
    //     makeCircle.center = new THREE.Vector3();
    //     makeCircle.radius = 1;
    //     const curve = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    //     changePoint.controlPoints = [curve.underlying.points.findByIndex(0)];
    //     changePoint.move = new THREE.Vector3(2, 0, 0);
    //     const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

    //     const bbox = new THREE.Box3().setFromObject(newCurve);
    //     const center = new THREE.Vector3();
    //     bbox.getCenter(center);
    //     expect(center).toApproximatelyEqual(new THREE.Vector3());
    //     expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-3, -3, 0));
    //     expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));

    //     expect(db.visibleObjects.length).toBe(2);
    //     expect(db.visibleObjects[0]).toBeInstanceOf(visual.SpaceInstance);

    // })
});