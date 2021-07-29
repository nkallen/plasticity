import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { Joint, PointOnCurve } from "../../src/commands/ContourManager";
import ContourFactory from '../../src/commands/curve/ContourFactory';
import { ContourFilletFactory, JointFilletFactory, JointOrPolylineOrContourFilletFactory, Polyline2ContourFactory, PolylineFilletFactory, PolylineOrContourFilletFactory } from "../../src/commands/curve/ContourFilletFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import JoinCurvesFactory from "../../src/commands/curve/JoinCurvesFactory";
import LineFactory from '../../src/commands/line/LineFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

describe(ContourFactory, () => {
    let makeContour: ContourFactory;
    beforeEach(() => {
        makeContour = new ContourFactory(db, materials, signals);
    });

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            for (var i = 0; i < 3; i++) {
                const makeLine = new LineFactory(db, materials, signals);
                makeLine.p1 = new THREE.Vector3(i - 1, i - 1, i - 1);
                makeLine.p2 = new THREE.Vector3(i, i, i);
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
});

describe(JoinCurvesFactory, () => {
    let makeContour: JoinCurvesFactory;
    let line1: visual.SpaceInstance<visual.Curve3D>;
    let line2: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(async () => {
        makeContour = new JoinCurvesFactory(db, materials, signals);

        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;


        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;
    });

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            makeContour.push(line1);
            makeContour.push(line2);

            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            expect(contours.length).toBe(1);
            const contour = contours[0];

            const bbox = new THREE.Box3().setFromObject(contour);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        });

        test('creates planar contours out of all ambiguous lines', async () => {
            makeContour.push(line1);
            makeContour.push(line2);

            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            expect(contours.length).toBe(1);
            const contour = contours[0];

            const inst = db.lookup(contour) as c3d.SpaceInstance;
            const item = inst.GetSpaceItem();
            const curve = item.Cast<c3d.Curve3D>(c3d.SpaceType.Curve3D);

            expect(curve.IsPlanar()).toBe(true);
        });
    })
});

describe(ContourFilletFactory, () => {
    test("two joined lines", async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        const contour = (await makeContour.commit())[0] as visual.SpaceInstance<visual.Curve3D>;

        const makeFillet = new ContourFilletFactory(db, materials, signals);
        makeFillet.contour = contour;
        makeFillet.controlPoints = [1];
        makeFillet.radius = 0.1;
        expect(makeFillet.cornerAngles.length).toBe(1);
        const filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(filleted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.429, 0.5, 0));

        expect(db.visibleObjects.length).toBe(1);
    });

    test("fillet of 0th control point of triangle", async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine3 = new LineFactory(db, materials, signals);
        makeLine3.p1 = new THREE.Vector3();
        makeLine3.p2 = new THREE.Vector3(0, 1, 0);
        const line3 = await makeLine3.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        makeContour.push(line3);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        const contour = contours[0];

        const makeFillet = new ContourFilletFactory(db, materials, signals);
        makeFillet.contour = contour;
        makeFillet.controlPoints = [0];
        makeFillet.radius = 0.1;
        expect(makeFillet.cornerAngles.length).toBe(1);
        const filleted = await makeFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(filleted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.57, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });
});

describe(JointFilletFactory, () => {
    let curveFillet: JointFilletFactory;

    beforeEach(() => {
        curveFillet = new JointFilletFactory(db, materials, signals);
    })

    test("when filleting Joints", async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const on1 = new PointOnCurve(line1, 1, 0, 1);
        const on2 = new PointOnCurve(line2, 0, 0, 1);
        const joint = new Joint(on1, on2);

        await curveFillet.setJoint(joint);
        curveFillet.radius = 0.1;
        expect(curveFillet.cornerAngle.axis).toApproximatelyEqual(new THREE.Vector3(0,0,1));
        const filletted = await curveFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(filletted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.429, 0.5, 0));

        expect(db.visibleObjects.length).toBe(1);
    });

    test("when filleting Joints of curve + contour in a triangular configuration", async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        const contour = contours[0];

        const makeLine3 = new LineFactory(db, materials, signals);
        makeLine3.p1 = new THREE.Vector3();
        makeLine3.p2 = new THREE.Vector3(0, 1, 0);
        const line3 = await makeLine3.commit() as visual.SpaceInstance<visual.Curve3D>;

        const on1 = new PointOnCurve(line3, 0, 0, 1);
        const on2 = new PointOnCurve(contour, 2, 0, 2);
        const joint = new Joint(on1, on2);

        await curveFillet.setJoint(joint);
        curveFillet.radius = 0.1;
        const filletted = await curveFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(filletted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        const inst = db.lookup(filletted) as c3d.SpaceInstance;
        const item = inst.GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(item.IsA());
        expect (curve.IsClosed()).toBe(true);

        expect(db.visibleObjects.length).toBe(1);
    })
});

describe(PolylineFilletFactory, () => {
    let curveFillet: PolylineFilletFactory;
    let polyline: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(() => {
        curveFillet = new PolylineFilletFactory(db, materials, signals);
    });

    beforeEach(async () => {
        const makePolyline = new CurveFactory(db, materials, signals);
        makePolyline.type = c3d.SpaceType.Polyline3D;
        makePolyline.points.push(new THREE.Vector3());
        makePolyline.points.push(new THREE.Vector3(1, 1, 0));
        makePolyline.points.push(new THREE.Vector3(2, -1, 0));
        makePolyline.points.push(new THREE.Vector3(3, 1, 0));
        makePolyline.points.push(new THREE.Vector3(4, -1, 0));
        polyline = await makePolyline.commit() as visual.SpaceInstance<visual.Curve3D>;
    })

    test("when filleting middle points", async () => {
        await curveFillet.setPolyline(polyline);
        curveFillet.controlPoints = [1, 3];
        curveFillet.radius = 0.1;
        expect(curveFillet.cornerAngles.length).toBe(2);
        const filletted = await curveFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(filletted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(2, -0.03, 0));


        expect(db.visibleObjects.length).toBe(1);
    })
});

describe(PolylineOrContourFilletFactory, () => {
    let curveFillet: PolylineOrContourFilletFactory;
    let polyline: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(() => {
        curveFillet = new PolylineOrContourFilletFactory(db, materials, signals);
    });

    beforeEach(async () => {
        const makePolyline = new CurveFactory(db, materials, signals);
        makePolyline.type = c3d.SpaceType.Polyline3D;
        makePolyline.points.push(new THREE.Vector3());
        makePolyline.points.push(new THREE.Vector3(1, 1, 0));
        makePolyline.points.push(new THREE.Vector3(2, -1, 0));
        makePolyline.points.push(new THREE.Vector3(3, 1, 0));
        makePolyline.points.push(new THREE.Vector3(4, -1, 0));
        polyline = await makePolyline.commit() as visual.SpaceInstance<visual.Curve3D>;
    })

    test("when filleting middle points", async () => {
        await curveFillet.setCurve(polyline);
        curveFillet.controlPoints = [1, 3];
        curveFillet.radius = 0.1;
        const filletted = await curveFillet.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(filletted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(2, -0.03, 0));

        expect(db.visibleObjects.length).toBe(1);
    })
});

describe(JointOrPolylineOrContourFilletFactory, () => {
    let curveFillet: JointOrPolylineOrContourFilletFactory;
    let contour: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(() => {
        curveFillet = new JointOrPolylineOrContourFilletFactory(db, materials, signals);
    });

    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine3 = new LineFactory(db, materials, signals);
        makeLine3.p1 = new THREE.Vector3();
        makeLine3.p2 = new THREE.Vector3(0, 1, 0);
        const line3 = await makeLine3.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        makeContour.push(line3);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];
    })

    test.only("when start/end of closed contour", async () => {
        await curveFillet.setControlPoints([{
            index: 0, parentItem: contour
        }]);
        curveFillet.radius = 0.1;
        const filletteds = await curveFillet.commit() as visual.SpaceInstance<visual.Curve3D>[];
        const filletted = filletteds[0];

        const bbox = new THREE.Box3().setFromObject(filletted);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.57, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0.14, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        expect(db.visibleObjects.length).toBe(1);
    })
});

describe(Polyline2ContourFactory, () => {
    let convert: Polyline2ContourFactory;
    let polyline: visual.SpaceInstance<visual.Curve3D>;

    beforeEach(() => {
        convert = new Polyline2ContourFactory(db, materials, signals);
    });

    describe("open", () => {
        beforeEach(async () => {
            const makePolyline = new CurveFactory(db, materials, signals);
            makePolyline.type = c3d.SpaceType.Polyline3D;
            makePolyline.points.push(new THREE.Vector3());
            makePolyline.points.push(new THREE.Vector3(1, 1, 0));
            makePolyline.points.push(new THREE.Vector3(2, -1, 0));
            makePolyline.points.push(new THREE.Vector3(3, 1, 0));
            makePolyline.points.push(new THREE.Vector3(4, -1, 0));
            polyline = await makePolyline.commit() as visual.SpaceInstance<visual.Curve3D>;
        })

        test("converts", async () => {
            convert.polyline = polyline;
            const contour = await convert.commit() as visual.SpaceInstance<visual.Curve3D>;

            const bbox = new THREE.Box3().setFromObject(contour);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));

            expect(db.visibleObjects.length).toBe(1);
        })
    });

    describe("closed", () => {
        beforeEach(async () => {
            const makePolyline = new CurveFactory(db, materials, signals);
            makePolyline.type = c3d.SpaceType.Polyline3D;
            makePolyline.points.push(new THREE.Vector3());
            makePolyline.points.push(new THREE.Vector3(1, 1, 0));
            makePolyline.points.push(new THREE.Vector3(2, -1, 0));
            makePolyline.points.push(new THREE.Vector3(3, 1, 0));
            makePolyline.points.push(new THREE.Vector3(4, -1, 0));
            makePolyline.closed = true;
            polyline = await makePolyline.commit() as visual.SpaceInstance<visual.Curve3D>;
        })

        test("converts", async () => {
            convert.polyline = polyline;
            const contour = await convert.commit() as visual.SpaceInstance<visual.Curve3D>;

            const bbox = new THREE.Box3().setFromObject(contour);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));

            expect(db.visibleObjects.length).toBe(1);
        })
    });
});