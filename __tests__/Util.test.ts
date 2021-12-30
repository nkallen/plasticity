import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import { CenterPointArcFactory } from "../src/commands/arc/ArcFactory";
import CurveFactory from "../src/commands/curve/CurveFactory";
import JoinCurvesFactory from "../src/commands/curve/JoinCurvesFactory";
import LineFactory from "../src/commands/line/LineFactory";
import { ProjectCurveFactory } from "../src/commands/translate/ProjectCurveFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/visual_model/VisualModel';
import { composeMainName, curve3d2curve2d, decomposeMainName, inst2curve, mat2mat, normalizeCurve, normalizePlacement, point2point, polyline2contour, unit } from "../src/util/Conversion";
import { Redisposable, RefCounter, WeakValueMap } from "../src/util/Util";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

describe('RefCounter', () => {
    let refCounter: RefCounter<unknown>;

    beforeEach(() => {
        refCounter = new RefCounter();
    });

    test('incr/decr creates and deletes', () => {
        const x = {};
        expect(refCounter.has(x)).toBeFalsy();
        let d1: jest.Mock<unknown>, d2: jest.Mock<unknown>;
        refCounter.incr(x, new Redisposable(d1 = jest.fn()));
        refCounter.incr(x, new Redisposable(d2 = jest.fn()));
        expect(d1).not.toHaveBeenCalled();
        expect(d2).not.toHaveBeenCalled();
        refCounter.decr(x);
        expect(d1).not.toHaveBeenCalled();
        expect(d2).not.toHaveBeenCalled();
        refCounter.decr(x);
        expect(d1).toHaveBeenCalledTimes(1);
        expect(d2).toHaveBeenCalledTimes(1);
    });

    test('when refcounter is copied, the cleanup callbacks are called TWICE -- i.e., do not use Disposable', () => {
        const x = {};
        let d1: jest.Mock<unknown>;
        refCounter.incr(x, new Redisposable(d1 = jest.fn()));
        expect(d1).not.toHaveBeenCalled();

        const copy = new RefCounter(refCounter);

        refCounter.decr(x);
        expect(d1).toHaveBeenCalledTimes(1);

        copy.decr(x);
        expect(d1).toHaveBeenCalledTimes(2);
    });
});

describe('WeakValueMap', () => {
    let map: WeakValueMap<string, Record<string, unknown>>;

    beforeEach(() => {
        map = new WeakValueMap();
    });

    test('incr/decr creates and deletes', () => {
        let x: any = {};
        expect(map.get("foo")).toBeUndefined();
        map.set("foo", x);
        expect(map.get("foo")).toBe(x);
        x = undefined;
        // expect(map.get("foo")).toBeUndefined();
    });
})

describe("curve3d2curve2d", () => {
    let db: GeometryDatabase;
    let materials: Required<MaterialDatabase>;
    let signals: EditorSignals;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
    })

    test("when given a planar curve", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        const view = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem()!;
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const curve2d = curve3d2curve2d(curve, new c3d.Placement3D());
        expect(curve2d).not.toBeUndefined();
    });

    test("when given a line and exact hint", async () => {
        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, 2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2));
        const view = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem()!;
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const curve2d = curve3d2curve2d(curve, new c3d.Placement3D());
        expect(curve2d).not.toBeUndefined();
    });

    test("when given a line and compatible hint", async () => {
        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, 2, 1));
        makeLine.points.push(new THREE.Vector3(2, 2, 1));
        const view = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem()!;
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const curve2d = curve3d2curve2d(curve, new c3d.Placement3D());
        expect(curve2d).not.toBeUndefined();
    });


    test("when given a line and an incompatible hint", async () => {
        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, 2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const view = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem()!;
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const incompatible = new c3d.Placement3D(new c3d.CartPoint3D(0, 0, 0), new c3d.Vector3D(1, 1, 1), new c3d.Vector3D(1, 0, 0), false);
        const curve2d = curve3d2curve2d(curve, incompatible);
        expect(curve2d).toBeUndefined();
    });

    test("when given a non-planar curve", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(0, 2, 0));
        makeCurve.points.push(new THREE.Vector3(1, 2, 2));
        makeCurve.points.push(new THREE.Vector3(2, 0, 1));
        makeCurve.points.push(new THREE.Vector3(3, 3, 3));
        const view = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem()!;
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const curve2d = curve3d2curve2d(curve, new c3d.Placement3D());

        expect(curve2d).toBeUndefined();
    })
});

describe("normalizePlacement", () => {
    let db: GeometryDatabase;
    let materials: Required<MaterialDatabase>;
    let signals: EditorSignals;
    let existingPlacements: Set<c3d.Placement3D>;
    let curve3d: c3d.Curve3D;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
        existingPlacements = new Set<c3d.Placement3D>();
        existingPlacements.add(new c3d.Placement3D());
        expect(existingPlacements.size).toBe(1);
    })

    beforeEach(async () => {
        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, 2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const view = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem()!;
        curve3d = item.Cast<c3d.Curve3D>(item.IsA());
    })

    test("when matches existing placement", async () => {
        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D())!;
        const start = curve2d.GetLimitPoint(1);
        expect(start.x).toBe(unit(-2));
        expect(start.y).toBe(unit(2));

        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(1);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(unit(-2));
        expect(newStart.y).toBe(unit(2));

    })

    test("when matches existing placement but must be transformed", async () => {
        const offCenterPlacement = new c3d.Placement3D(new c3d.CartPoint3D(100, 100, 0), new c3d.Vector3D(0, 0, 1), new c3d.Vector3D(1, 0, 0), false);
        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, offCenterPlacement)!;
        const start = curve2d.GetLimitPoint(1);
        expect(start.x).toBe(unit(-3));
        expect(start.y).toBe(unit(1));

        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(1);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(unit(-2));
        expect(newStart.y).toBe(unit(2));
    })

    test("does not match existing placement (same orientation, different offset along Z)", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(-2, -2, 2)); // NOTE: on a diff plane
        makeCurve.points.push(new THREE.Vector3(-2, 2, 2));
        const view = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        const item = db.lookup(view).GetSpaceItem()!;
        curve3d = item.Cast<c3d.Curve3D>(item.IsA());

        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D(new c3d.CartPoint3D(0, 0, 2), new c3d.Vector3D(0, 0, 1), new c3d.Vector3D(1, 0, 0), false))!;
        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(2);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(unit(-2));
        expect(newStart.y).toBe(unit(-2));
    });

    test("does not match existing placement (different Z orientation)", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(0, -1, -1)); // NOTE: on a diff plane orientation
        makeCurve.points.push(new THREE.Vector3(0, 1, 1));
        const view = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        const item = db.lookup(view).GetSpaceItem()!;
        curve3d = item.Cast<c3d.Curve3D>(item.IsA());

        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D(new c3d.CartPoint3D(0, 0, 0), new c3d.Vector3D(1, 0, 0), new c3d.Vector3D(0, 1, 0), false))!;
        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(2);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(unit(-1));
        expect(newStart.y).toBe(unit(-1));
    });
});

describe('conversion', () => {
    test('mat2mat', () => {
        const mat = new THREE.Matrix4();
        mat.set(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16);
        const reverso = mat2mat(mat2mat(mat));
        expect(reverso.elements).toEqual(mat.elements);
    })
})

test('compose & decompose main name', () => {
    const mainName = composeMainName(c3d.CreatorType.FilletSolid, 1);
    const [type, clock] = decomposeMainName(mainName);
    expect(type).toBe(c3d.CreatorType.FilletSolid);
    expect(clock).toBe(1);
})

describe('normalizeCurve', () => {
    let db: GeometryDatabase;
    let materials: MaterialDatabase;
    let signals: EditorSignals;
    const center = new THREE.Vector3();
    const bbox = new THREE.Box3();

    beforeEach(async () => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
    })

    describe('A simple polyline', () => {
        let curve: visual.SpaceInstance<visual.Curve3D>;

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

        test('it makes segments', async () => {
            const model = inst2curve(db.lookup(curve))!;
            const inst = await normalizeCurve(model);
            expect(inst.GetSegmentsCount()).toBe(2);
        });

        test('order is preserved', async () => {
            const model = inst2curve(db.lookup(curve))!;
            const contour = await normalizeCurve(model);
            const first = point2point(contour.GetLimitPoint(1));
            expect(first).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
            const last = point2point(contour.GetLimitPoint(2));
            expect(last).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });
    });

    describe('A trimmed polyline', () => {
        let polyline: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            polyline = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        });

        test('it works', async () => {
            const model = inst2curve(db.lookup(polyline)) as c3d.Polyline3D;
            const contour = await normalizeCurve(model.Trimmed(0.1, 10, 1)!);
            expect(contour.GetSegmentsCount()).toBe(2);
        });
    })

    describe('arcs', () => {
        let line1, arc1, line2, contour: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeLine1 = new LineFactory(db, materials, signals);
            makeLine1.p1 = new THREE.Vector3(-2, 0, 0);
            makeLine1.p2 = new THREE.Vector3(-1, 0, 0);
            line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeArc1 = new CenterPointArcFactory(db, materials, signals);
            makeArc1.center = new THREE.Vector3(0, 0, 0);
            makeArc1.p2 = new THREE.Vector3(-1, 0, 0);
            makeArc1.p3 = new THREE.Vector3(1, 0, 0);
            arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeLine2 = new LineFactory(db, materials, signals);
            makeLine2.p1 = new THREE.Vector3(1, 0, 0);
            makeLine2.p2 = new THREE.Vector3(2, 0, 0);
            line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(line1);
            makeContour.push(arc1);
            makeContour.push(line2);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
            contour = contours[0];
        });

        it('works', async () => {
            const model = inst2curve(db.lookup(contour)) as c3d.Polyline3D;
            const normalized = await normalizeCurve(model);
            expect(normalized.IsClosed()).toBe(false);
            expect(normalized.GetSegmentsCount()).toBe(3);
        })
    });

    describe('planar curves', () => {
        let line1, arc1, line2, projected: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeLine1 = new LineFactory(db, materials, signals);
            makeLine1.p1 = new THREE.Vector3(-2, 0, 0);
            makeLine1.p2 = new THREE.Vector3(-1, 0, 1);
            line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeArc1 = new CenterPointArcFactory(db, materials, signals);
            makeArc1.center = new THREE.Vector3(0, 0, 1);
            makeArc1.p2 = new THREE.Vector3(-1, 0, 1);
            makeArc1.p3 = new THREE.Vector3(1, 0, 1);
            arc1 = await makeArc1.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeLine2 = new LineFactory(db, materials, signals);
            makeLine2.p1 = new THREE.Vector3(1, 0, 1);
            makeLine2.p2 = new THREE.Vector3(2, 0, 0);
            line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

            const makeContour = new JoinCurvesFactory(db, materials, signals);
            makeContour.push(line1);
            makeContour.push(arc1);
            makeContour.push(line2);
            const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];

            const project = new ProjectCurveFactory(db, materials, signals);
            project.curves = contours;
            project.origin = new THREE.Vector3();
            project.normal = new THREE.Vector3(0, 0, 1);
            const projecteds = await project.commit() as visual.SpaceInstance<visual.Curve3D>[];
            projected = projecteds[0];
        });

        it('works', async () => {
            const model = inst2curve(db.lookup(projected)) as c3d.PlaneCurve;
            const normalized = await normalizeCurve(model);
            expect(normalized.IsClosed()).toBe(false);
            expect(normalized.GetSegmentsCount()).toBe(3);
        })
    })

    describe('contour on plane', () => {
        it('works', async () => {
            const line1 = new c3d.LineSegment(new c3d.CartPoint(0, 0), new c3d.CartPoint(0, 1));
            const line2 = new c3d.LineSegment(new c3d.CartPoint(0, 1), new c3d.CartPoint(2, 1));
            const plane = new c3d.Plane(new c3d.CartPoint3D(0, 0, 0), new c3d.CartPoint3D(0, 1, 0), new c3d.CartPoint3D(1, 1, 0));
            const contour = new c3d.ContourOnPlane(plane, new c3d.Contour([line1, line2], false), false);
            const normalized = await normalizeCurve(contour);
            expect(normalized.IsClosed()).toBe(false);
            expect(normalized.GetSegmentsCount()).toBe(2);
        })
    })
})


describe('polyline2contour', () => {
    let db: GeometryDatabase;
    let materials: MaterialDatabase;
    let signals: EditorSignals;

    beforeEach(async () => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
    })

    let polyline: c3d.Polyline3D;

    describe("open", () => {
        beforeEach(async () => {
            const makePolyline = new CurveFactory(db, materials, signals);
            makePolyline.type = c3d.SpaceType.Polyline3D;
            makePolyline.points.push(new THREE.Vector3());
            makePolyline.points.push(new THREE.Vector3(1, 1, 0));
            makePolyline.points.push(new THREE.Vector3(2, -1, 0));
            makePolyline.points.push(new THREE.Vector3(3, 1, 0));
            makePolyline.points.push(new THREE.Vector3(4, -1, 0));
            polyline = inst2curve(await makePolyline.calculate() as c3d.SpaceInstance) as c3d.Polyline3D;
        })

        test("converts", async () => {
            const contour = await polyline2contour(polyline);
            const view = await db.addItem(new c3d.SpaceInstance(contour));

            const bbox = new THREE.Box3().setFromObject(view);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));
        });

        test('order is preserved', async () => {
            const contour = await polyline2contour(polyline);
            const first = point2point(contour.GetLimitPoint(1));
            expect(first).toApproximatelyEqual(new THREE.Vector3());
            const last = point2point(contour.GetLimitPoint(2));
            expect(last).toApproximatelyEqual(new THREE.Vector3(4, -1, 0));
        });
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
            polyline = inst2curve(await makePolyline.calculate() as c3d.SpaceInstance) as c3d.Polyline3D;
        })

        test("converts", async () => {
            const contour = await polyline2contour(polyline);
            const view = await db.addItem(new c3d.SpaceInstance(contour));

            const bbox = new THREE.Box3().setFromObject(view);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));
        })
    });
});