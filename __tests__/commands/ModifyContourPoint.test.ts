import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterPointArcFactory } from "../../src/commands/arc/ArcFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import JoinCurvesFactory from "../../src/commands/curve/JoinCurvesFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { FreestyleScaleContourPointFactory, MoveContourPointFactory, RemoveContourPointFactory, RotateContourPointFactory, ScaleContourPointFactory } from "../../src/commands/modify_contour/ModifyContourPointFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { inst2curve } from "../../src/util/Conversion";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";

let db: GeometryDatabase;
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

describe(MoveContourPointFactory, () => {
    let changePoint: MoveContourPointFactory;

    beforeEach(() => {
        changePoint = new MoveContourPointFactory(db, materials, signals);
    })

    describe.skip('Arc3D', () => {
        beforeEach(async () => {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3();
            makeCircle.radius = 1;
            curve = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        });

        test.only('moving point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.move = new THREE.Vector3(2, 0, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-3, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 0, 0));
            expect(db.visibleObjects.length).toBe(1);
        });
    });

    describe('Polyline3D', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve))!;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });

        test('controlPointInfo', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const info = changePoint.controlPointInfo;
            expect(info.length).toBe(3);
            expect(info[0].origin).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            expect(info[0].segmentIndex).toBe(0);
            expect(info[0].limit).toBe(1);
            expect(info[1].origin).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(info[1].segmentIndex).toBe(1);
            expect(info[1].limit).toBe(1);
            expect(info[2].origin).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(info[2].segmentIndex).toBe(1);
            expect(info[2].limit).toBe(2);
        })

        test('moving last point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('moving first point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-1, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-4, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('moving middle point', async () => {
            changePoint.originalItem = curve;
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, 0, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        })

        test('moving two points', async () => {
            changePoint.originalItem = curve;
            changePoint.controlPoints = [curve.underlying.points.get(0), curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, 0, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-1, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-4, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        })
    })

    describe('triangle', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3());
            makeCurve.points.push(new THREE.Vector3(1, 1, 0));
            makeCurve.points.push(new THREE.Vector3(0, 1, 0));
            makeCurve.closed = true;
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve))!;
            expect(model.IsClosed()).toBe(true);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        })

        it('changes first/last point', async () => {
            changePoint.originalItem = curve;
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-1, -1, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(3);
            expect(model.IsClosed()).toBe(true);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
            expect(db.visibleObjects.length).toBe(1);
        })
    });

    describe('Line:Arc', () => {
        beforeEach(async () => {
            const makeLine1 = new LineFactory(db, materials, signals);
            makeLine1.p1 = new THREE.Vector3();
            makeLine1.p2 = new THREE.Vector3(1, 0, 0);
            const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeArc1 = new CenterPointArcFactory(db, materials, signals);
            makeArc1.center = new THREE.Vector3(-1, 0, 0);
            makeArc1.p2 = new THREE.Vector3(-2, 0, 0);
            makeArc1.p3 = new THREE.Vector3();
            const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(arc1);
            makeContour.push(line1);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            curve = contours[0];

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

            const model = inst2curve(db.lookup(curve)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(2);
        });

        it('changes the line/arc junction', async () => {
            changePoint.originalItem = curve;
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-1, 0, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(2);
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0.25, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0.5, 0));
            expect(db.visibleObjects.length).toBe(1);
        })
    });

    describe('PolyCurve', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Hermit3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.96, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.08, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });

        test('moving a middle point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, -0.017, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2.03, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        })

        test('controlPointInfo', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const info = changePoint.controlPointInfo;
            expect(info.length).toBe(3);
            expect(info[0].origin).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            expect(info[0].segmentIndex).toBe(0)
            expect(info[0].limit).toBe(1)
            expect(info[1].origin).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(info[1].segmentIndex).toBe(0)
            expect(info[1].limit).toBe(-1)
            expect(info[2].origin).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(info[2].segmentIndex).toBe(0)
            expect(info[2].limit).toBe(-1)
        })
    });

    describe('Line:Polycurve', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Hermit3D;
            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            const hermit = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeLine = new CurveFactory(db, materials, signals);
            makeLine.type = c3d.SpaceType.Polyline3D;
            makeLine.points.push(new THREE.Vector3(2, 2, 0));
            makeLine.points.push(new THREE.Vector3(3, 3, 0));
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(hermit);
            makeContour.push(line);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            curve = contours[0];

            const model = inst2curve(db.lookup(curve)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.46, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.08, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
        });

        test('moving a junction point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.33, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.33, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(db.visibleObjects.length).toBe(1);
        })

        test('controlPointInfo', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const info = changePoint.controlPointInfo;
            expect(info.length).toBe(4);
            expect(info[0].origin).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            expect(info[0].segmentIndex).toBe(0);
            expect(info[0].limit).toBe(1);
            expect(info[1].origin).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(info[1].segmentIndex).toBe(0);
            expect(info[1].limit).toBe(-1);
            expect(info[2].origin).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(info[2].segmentIndex).toBe(1);
            expect(info[2].limit).toBe(1);
            expect(info[3].origin).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(info[3].segmentIndex).toBe(1);
            expect(info[3].limit).toBe(2);
        })
    })

    describe('Polycurve:Line', () => {
        beforeEach(async () => {
            const makeLine = new CurveFactory(db, materials, signals);
            makeLine.type = c3d.SpaceType.Polyline3D;
            makeLine.points.push(new THREE.Vector3(2, 2, 0));
            makeLine.points.push(new THREE.Vector3(3, 3, 0));
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Hermit3D;
            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            const hermit = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(line);
            makeContour.push(hermit);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            curve = contours[0];

            const model = inst2curve(db.lookup(curve)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.46, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.08, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
        });

        test('moving a junction point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(result)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(result);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.33, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.33, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(db.visibleObjects.length).toBe(1);
        })

        test('controlPointInfo', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.move = new THREE.Vector3(-2, -2, 0);
            const info = changePoint.controlPointInfo;
            expect(info.length).toBe(4);
            expect(info[0].origin).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(info[0].segmentIndex).toBe(0);
            expect(info[0].limit).toBe(1);
            expect(info[1].origin).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(info[1].segmentIndex).toBe(1);
            expect(info[1].limit).toBe(1);
            expect(info[2].origin).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(info[2].segmentIndex).toBe(1);
            expect(info[2].limit).toBe(-1);
            expect(info[3].origin).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            expect(info[3].segmentIndex).toBe(1);
            expect(info[3].limit).toBe(-1);
        })
    })
});

describe(RemoveContourPointFactory, () => {
    let changePoint: RemoveContourPointFactory;

    beforeEach(() => {
        changePoint = new RemoveContourPointFactory(db, materials, signals);
    })

    describe('Polyline3D', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(3, 0, 0));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve))!;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 2, 0));
        });

        test('remove first point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('remove middle point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('remove last point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('remove two adjacent points', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0), curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2.5, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('remove two staggered points', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1), curve.underlying.points.get(3)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 2, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('remove all but one point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0), curve.underlying.points.get(1), curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            expect(result.length).toBe(0);
        });
    });

    describe('Line:Polycurve', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Hermit3D;
            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            const hermit = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeLine = new CurveFactory(db, materials, signals);
            makeLine.type = c3d.SpaceType.Polyline3D;
            makeLine.points.push(new THREE.Vector3(2, 2, 0));
            makeLine.points.push(new THREE.Vector3(3, 3, 0));
            const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(hermit);
            makeContour.push(line);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            curve = contours[0];

            const model = inst2curve(db.lookup(curve)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.46, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.08, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
        });

        test('removing a junction point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.45, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -0.08, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(db.visibleObjects.length).toBe(1);
        })

        test('removing a mid point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 1.7, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0.41, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(db.visibleObjects.length).toBe(1);
        })

        test('removing all points in polycurve removes its segment', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0), curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            expect(contour.GetSegmentsCount()).toBe(2);

            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            const model = inst2curve(db.lookup(result[0])) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(1);

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2.5, 2.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 0));
            expect(db.visibleObjects.length).toBe(1);
        })
    });

    describe('Line:Arc', () => {
        beforeEach(async () => {
            const makeLine1 = new LineFactory(db, materials, signals);
            makeLine1.p1 = new THREE.Vector3();
            makeLine1.p2 = new THREE.Vector3(1, 0, 0);
            const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeArc1 = new CenterPointArcFactory(db, materials, signals);
            makeArc1.center = new THREE.Vector3(-1, 0, 0);
            makeArc1.p2 = new THREE.Vector3(-2, 0, 0);
            makeArc1.p3 = new THREE.Vector3();
            const arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(arc1);
            makeContour.push(line1);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            curve = contours[0];

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

            const model = inst2curve(db.lookup(curve)) as c3d.Contour3D;
            expect(model.GetSegmentsCount()).toBe(2);
        });

        test('removing a junction point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            const result = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>[];

            bbox.setFromObject(result[0]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0.75, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1.5, 0));
            expect(db.visibleObjects.length).toBe(1);
        })
    });
});

describe(ScaleContourPointFactory, () => {
    let changePoint: ScaleContourPointFactory;

    beforeEach(() => {
        changePoint = new ScaleContourPointFactory(db, materials, signals);
    })

    describe('Polyline3D', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 1));
            makeCurve.points.push(new THREE.Vector3(2, 2, -1));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve))!;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
        });


        test('scale second point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.scale = new THREE.Vector3(1, 1, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, -0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('scale all points', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0), curve.underlying.points.get(1), curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.scale = new THREE.Vector3(1, 1, 0);
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });
    })
})

describe(RotateContourPointFactory, () => {
    let changePoint: RotateContourPointFactory;

    beforeEach(() => {
        changePoint = new RotateContourPointFactory(db, materials, signals);
    })

    describe('Polyline3D', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 1));
            makeCurve.points.push(new THREE.Vector3(2, 2, -1));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve))!;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 1));
        });


        test('rotate second point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.axis = new THREE.Vector3(1, 1, 0);
            changePoint.angle = Math.PI / 2;
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, -0.75));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, -1.5));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
            expect(db.visibleObjects.length).toBe(1);
        });

        test('rotate all points', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(0), curve.underlying.points.get(1), curve.underlying.points.get(2)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.axis = new THREE.Vector3(1, 1, 0);
            changePoint.angle = Math.PI / 2;
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1.5, 1.5, 1.25));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(1, -1, -1.5));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 4, 4));
            expect(db.visibleObjects.length).toBe(1);
        });
    })
})

describe(FreestyleScaleContourPointFactory, () => {
    let changePoint: FreestyleScaleContourPointFactory;

    beforeEach(() => {
        changePoint = new FreestyleScaleContourPointFactory(db, materials, signals);
    })

    describe('Polyline3D', () => {
        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(0, 0, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve))!;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
        });


        test('scale second point', async () => {
            changePoint.controlPoints = [curve.underlying.points.get(1)];
            const contour = await changePoint.prepare(curve);
            changePoint.contour = contour;
            changePoint.originalItem = curve;
            changePoint.from(new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(1, 0, 0));
            changePoint.to(new THREE.Vector3(0.5, 0, 0), new THREE.Vector3(2, 0, 0));
            const newCurve = await changePoint.commit() as visual.SpaceInstance<visual.Curve3D>;

            bbox.setFromObject(newCurve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));
            expect(db.visibleObjects.length).toBe(1);
        });
    })
})