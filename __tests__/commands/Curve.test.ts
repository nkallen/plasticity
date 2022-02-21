import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import CurveFactory, { CurveWithPreviewFactory } from '../../src/commands/curve/CurveFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { DontCacheMeshCreator, ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { ConstructionPlaneSnap } from "../../src/editor/snaps/ConstructionPlaneSnap";
import { PlaneSnap, PointSnap, TanTanSnap } from "../../src/editor/snaps/Snap";
import { SolidCopier } from "../../src/editor/SolidCopier";
import { vec2vec } from "../../src/util/Conversion";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
})

describe(CurveFactory, () => {
    let makeCurve: CurveFactory;
    beforeEach(() => {
        makeCurve = new CurveFactory(db, materials, signals);
    })

    describe('projectOntoConstructionSurface', () => {
        test('ambiguous line with matching planar snap', async () => {
            const cartPoints = [new c3d.CartPoint3D(0, 1, 0), new c3d.CartPoint3D(0, 1, 1)];
            const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, false, c3d.SpaceType.Polyline3D);
            const projected = await CurveFactory.projectOntoConstructionSurface(curve, new PlaneSnap(Y, Y), new ConstructionPlaneSnap(X, Y));
            expect(projected.IsPlanar());
            const { curve2d, placement } = projected.GetPlaneCurve(false);
            expect(curve2d.IsA()).toBe(c3d.PlaneType.Polyline);
            expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(Y);
        });

        test('ambiguous line with non-matching planar snap but matching construction plane', async () => {
            const cartPoints = [new c3d.CartPoint3D(0, 1, 0), new c3d.CartPoint3D(0, 1, 1)];
            const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, false, c3d.SpaceType.Polyline3D);
            const projected = await CurveFactory.projectOntoConstructionSurface(curve, new PlaneSnap(Z, Y), new ConstructionPlaneSnap(X, Y));
            expect(projected.IsPlanar());
            const { curve2d, placement } = projected.GetPlaneCurve(false);
            expect(curve2d.IsA()).toBe(c3d.PlaneType.Polyline);
            expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(X);
        });

        test('ambiguous line with nonplanar snap but matching construction plane', async () => {
            const cartPoints = [new c3d.CartPoint3D(0, 1, 0), new c3d.CartPoint3D(0, 1, 1)];
            const curve = c3d.ActionCurve3D.SplineCurve(cartPoints, false, c3d.SpaceType.Polyline3D);
            const projected = await CurveFactory.projectOntoConstructionSurface(curve, new PointSnap(undefined, new THREE.Vector3()), new ConstructionPlaneSnap(X, Y));
            expect(projected.IsPlanar());
            const { curve2d, placement } = projected.GetPlaneCurve(false);
            expect(curve2d.IsA()).toBe(c3d.PlaneType.Polyline);
            expect(vec2vec(placement.GetAxisZ(), 1)).toApproximatelyEqual(X);
        });
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

    test('line', async () => {
        makeCurve.push(new THREE.Vector3());
        makeCurve.push(new THREE.Vector3(1, 1, 0));
        const item = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(item).toBeInstanceOf(visual.SpaceInstance);
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })

    test('line with tantan snap', async () => {
        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3(1, 1, 0);
        const p3 = new THREE.Vector3(2, 2, 0);
        const tantan = new TanTanSnap(p3, p2);
        makeCurve.push(p1);
        makeCurve.push(p2);
        makeCurve.snap = tantan;
        const item = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(item).toBeInstanceOf(visual.SpaceInstance);
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1.5, 1.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    })

    test('line with tantan snap undone', async () => {
        const p1 = new THREE.Vector3();
        const p2 = new THREE.Vector3(1, 1, 0);
        const p3 = new THREE.Vector3(2, 2, 0);
        const tantan = new TanTanSnap(p3, p2);
        makeCurve.push(p1);
        makeCurve.push(p2);
        makeCurve.snap = tantan;
        makeCurve.snap = new PlaneSnap();
        const item = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        expect(item).toBeInstanceOf(visual.SpaceInstance);
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
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

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);