import * as THREE from "three";
import CurveFactory, { CurveWithPreviewFactory } from '../../src/commands/curve/CurveFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
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

describe(CurveFactory, () => {
    let makeCurve: CurveFactory;
    beforeEach(() => {
        makeCurve = new CurveFactory(db, materials, signals);
    })

    test('invokes the appropriate c3d commands', async () => {
        makeCurve.push(new THREE.Vector3());
        makeCurve.push(new THREE.Vector3(1, 1, 0));
        makeCurve.push(new THREE.Vector3(2, -1, 0));
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

describe(CurveWithPreviewFactory, () => {
    let makeCurve: CurveWithPreviewFactory;
    beforeEach(() => {
        makeCurve = new CurveWithPreviewFactory(db, materials, signals);
    })

    test('invokes the appropriate c3d commands', async () => {
        const p1 = new THREE.Vector3(-1, -1, -1);
        const p2 = new THREE.Vector3(1, 1, 1);
        const p3 = new THREE.Vector3(1, 2, 3);
        const p4 = new THREE.Vector3(3, 2, 3);

        expect(makeCurve.preview.points).toEqual([new THREE.Vector3()]);

        makeCurve.preview.last = p1;
        expect(makeCurve.preview.points).toEqual([p1]);
        expect(makeCurve.preview.hasEnoughPoints).toBe(false);
        await makeCurve.preview.update();

        makeCurve.push(p2);
        expect(makeCurve.preview.hasEnoughPoints).toBe(true);
        expect(makeCurve.preview.points).toEqual([p2, p2]);
        await makeCurve.update();

        makeCurve.preview.last = p3;
        expect(makeCurve.preview.points).toEqual([p2, p3]);
        await makeCurve.preview.update();

        makeCurve.push(p4);
        expect(makeCurve.preview.points).toEqual([p2, p4, p4]);
        expect(makeCurve.underlying.points).toEqual([p2, p4]);
        await makeCurve.update();

        expect(makeCurve.preview.wouldBeClosed(p2)).toBe(true);
        makeCurve.preview.closed = true;
        await makeCurve.preview.update();

        expect(makeCurve.wouldBeClosed(p2)).toBe(true);
        makeCurve.closed = true;
        await makeCurve.update();
    });

    test('undo', async () => {
        const p1 = new THREE.Vector3(-1, -1, -1);
        const p2 = new THREE.Vector3(1, 1, 1);
        const p3 = new THREE.Vector3(1, 2, 3);
        const p4 = new THREE.Vector3(3, 2, 3);

        makeCurve.push(p1);
        await makeCurve.update();
        makeCurve.push(p2);
        await makeCurve.update();

        expect(makeCurve.preview.points).toEqual([p1, p2, p2]);
        expect(makeCurve.underlying.points).toEqual([p1, p2]);

        expect(db.temporaryObjects.children.length).toBe(2);

        makeCurve.undo();
        await makeCurve.update();

        expect(makeCurve.preview.points).toEqual([p1, p2]);
        expect(makeCurve.underlying.points).toEqual([p1]);

        expect(db.temporaryObjects.children.length).toBe(1);

        makeCurve.undo();
        await makeCurve.update();

        expect(makeCurve.preview.points).toEqual([p2]);
        expect(makeCurve.underlying.points).toEqual([]);

        expect(db.temporaryObjects.children.length).toBe(0);
    })
})