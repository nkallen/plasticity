import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import CurveFactory from "../src/commands/curve/CurveFactory";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/editor/VisualModel';
import { curve3d2curve2d, normalizePlacement } from "../src/util/Conversion";
import { RefCounter, WeakValueMap } from "../src/util/Util";
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
        refCounter.incr(x, d1 = jest.fn());
        refCounter.incr(x, d2 = jest.fn());
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
        refCounter.incr(x, d1 = jest.fn());
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
        let x = {};
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

        const item = db.lookup(view).GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const curve2d = curve3d2curve2d(curve, new c3d.Placement3D());
        expect(curve2d).not.toBeUndefined();
    });

    test("when given a line and compatible hint", async () => {
        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, 2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2));
        const view = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem();
        const curve = item.Cast<c3d.Curve3D>(item.IsA());

        const curve2d = curve3d2curve2d(curve, new c3d.Placement3D());
        expect(curve2d).not.toBeUndefined();
    });

    test("when given a line and an incompatible hint", async () => {
        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, 2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const view = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const item = db.lookup(view).GetSpaceItem();
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

        const item = db.lookup(view).GetSpaceItem();
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

        const item = db.lookup(view).GetSpaceItem();
        curve3d = item.Cast<c3d.Curve3D>(item.IsA());
    })

    test("when matches existing placement", async () => {
        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D());
        const start = curve2d.GetLimitPoint(1);
        expect(start.x).toBe(-2);
        expect(start.y).toBe(2);

        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(1);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(-2);
        expect(newStart.y).toBe(2);

    })

    test("when matches existing placement but must be transformed", async () => {
        const offCenterPlacement = new c3d.Placement3D(new c3d.CartPoint3D(1, 1, 0), new c3d.Vector3D(0, 0, 1), new c3d.Vector3D(1, 0, 0), false);
        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, offCenterPlacement);
        const start = curve2d.GetLimitPoint(1);
        expect(start.x).toBe(-3);
        expect(start.y).toBe(1);

        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(1);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(-2);
        expect(newStart.y).toBe(2);
    })

    test("does not match existing placement (same orientation, different offset along Z)", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(-2, -2, 2)); // NOTE: on a diff plane
        makeCurve.points.push(new THREE.Vector3(-2, 2, 2));
        const view = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        const item = db.lookup(view).GetSpaceItem();
        curve3d = item.Cast<c3d.Curve3D>(item.IsA());

        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D(new c3d.CartPoint3D(0, 0, 2), new c3d.Vector3D(0, 0, 1), new c3d.Vector3D(1, 0, 0), false));
        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(2);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(-2);
        expect(newStart.y).toBe(-2);
    });

    test("does not match existing placement (different Z orientation)", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(0, -1, -1)); // NOTE: on a diff plane orientation
        makeCurve.points.push(new THREE.Vector3(0, 1, 1));
        const view = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        const item = db.lookup(view).GetSpaceItem();
        curve3d = item.Cast<c3d.Curve3D>(item.IsA());

        const { curve: curve2d, placement } = curve3d2curve2d(curve3d, new c3d.Placement3D(new c3d.CartPoint3D(0, 0, 0), new c3d.Vector3D(1, 0, 0), new c3d.Vector3D(0, 1, 0), false));
        normalizePlacement(curve2d, placement, existingPlacements);

        expect(existingPlacements.size).toBe(2);
        const newStart = curve2d.GetLimitPoint(1);
        expect(newStart.x).toBe(-1);
        expect(newStart.y).toBe(-1);
    });
});