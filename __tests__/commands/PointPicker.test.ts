import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import { Model } from '../../src/commands/PointPicker';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { AxisSnap, CurveEdgeSnap, OrRestriction, PlaneSnap, PointSnap, SnapManager } from '../../src/editor/SnapManager';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials, FakeSprites } from "../../__mocks__/FakeMaterials";
import '../matchers';

let pointPicker: Model;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let snaps: SnapManager;
let sprites: FakeSprites;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    snaps = new SnapManager(db, sprites, signals);
    sprites = new FakeSprites();
    pointPicker = new Model(db, snaps);
});

describe('restrictToPlaneThroughPoint', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        pointPicker.restrictToPlaneThroughPoint(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(PlaneSnap);
        const planeSnap = restrictions[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(new PlaneSnap());
        expect(snaps.length).toBe(1);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);
    
        const planeSnap = snaps[0] as PlaneSnap;
        expect(planeSnap.n).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(planeSnap.p).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
});

describe('addPointSnap', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        pointPicker.addPointSnap(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(0);
    })

    test("snapsFor", () => {
        const snaps = pointPicker.snapsFor(new PlaneSnap());
        expect(snaps.length).toBe(2);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);
        expect(snaps[1]).toBeInstanceOf(PointSnap);
    })
});

describe('addPickedPoint', () => {
    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        pointPicker.addPickedPoint(new THREE.Vector3(1, 1, 1));
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(0);

        pointPicker.undo();
        expect(restrictions.length).toBe(0);
    })

    test("snapsFor", () => {
        let snaps;
        snaps = pointPicker.snapsFor(new PlaneSnap());
        expect(snaps.length).toBe(4);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);
        expect(snaps[1]).toBeInstanceOf(AxisSnap);
        expect(snaps[2]).toBeInstanceOf(AxisSnap);
        expect(snaps[3]).toBeInstanceOf(AxisSnap);

        pointPicker.undo();
        snaps = pointPicker.snapsFor(new PlaneSnap());
        expect(snaps.length).toBe(1);
    })
});

describe('restrictToEdges', () => {
    let box: visual.Solid;
    let or: OrRestriction<CurveEdgeSnap>

    beforeEach(async () => {
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    });

    beforeEach(() => {
        expect(pointPicker.restrictionsFor(new PlaneSnap()).length).toBe(0);
        or = pointPicker.restrictToEdges([box.edges.get(0), box.edges.get(1)]);
    })

    test("restrictionsFor", () => {
        const restrictions = pointPicker.restrictionsFor(new PlaneSnap());
        expect(restrictions.length).toBe(1);
        expect(restrictions[0]).toBeInstanceOf(OrRestriction);
        expect(restrictions[0]).toBe(or);
        expect(or.isValid(new THREE.Vector3(0, 0.5, 0))).toBe(true);
        expect(or.isValid(new THREE.Vector3(0.5, 0, 0))).toBe(false);
        expect(or.isValid(new THREE.Vector3(1, 1, 0))).toBe(true);
    })

    test("snapsFor", () => {
        let snaps;
        snaps = pointPicker.snapsFor(new PlaneSnap());
        expect(snaps.length).toBe(3);
        expect(snaps[0]).toBeInstanceOf(PlaneSnap);
        expect(snaps[1]).toBeInstanceOf(CurveEdgeSnap);
        expect(snaps[2]).toBeInstanceOf(CurveEdgeSnap);
    })
});