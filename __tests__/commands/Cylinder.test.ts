import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import CylinderFactory, { PossiblyBooleanCylinderFactory } from "../../src/commands/cylinder/CylinderFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
})

describe(CylinderFactory, () => {
    let makeCylinder: CylinderFactory;

    beforeEach(() => {
        makeCylinder = new CylinderFactory(db, materials, signals);
    })

    test('upright cylinder', async () => {
        makeCylinder.base = new THREE.Vector3();
        makeCylinder.radius = new THREE.Vector3(1, 0, 0);
        makeCylinder.height = new THREE.Vector3(0, 0, 10);
        const item = await makeCylinder.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 10));
    });

    test('sideways that starts off vertical but ends sideways X cylinder', async () => {
        makeCylinder.base = new THREE.Vector3();
        makeCylinder.radius = new THREE.Vector3(1, 0, 0); // radius set as if we were going in Z
        makeCylinder.height = new THREE.Vector3(10, 0, 0); // but actualyl we turn towards X
        const item = await makeCylinder.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(5, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(10, 1, 1));
    });

    test('sideways that starts off vertical but ends sideways Y cylinder', async () => {
        makeCylinder.base = new THREE.Vector3();
        makeCylinder.radius = new THREE.Vector3(1, 0, 0); // radius set as if we were going in Z
        makeCylinder.height = new THREE.Vector3(0, 10, 0); // but actualyl we turn towards X
        const item = await makeCylinder.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 10, 1));
    });

    test('sideways but not based in origin and going diagonal', async () => {
        makeCylinder.base = new THREE.Vector3(1, 1, 1); // start off not at origin
        makeCylinder.radius = new THREE.Vector3(); // radius set as if we were going in Z
        makeCylinder.height = new THREE.Vector3(9, 0, 0); // but actualyl we turn towards X
        const item = await makeCylinder.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(5, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0.69, -1.72, -1.72));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(9.3, 2.72, 2.72));
    });
});

describe(PossiblyBooleanCylinderFactory, () => {
    let makeCylinder: PossiblyBooleanCylinderFactory;
    let sphere: visual.Solid;

    beforeEach(() => {
        makeCylinder = new PossiblyBooleanCylinderFactory(db, materials, signals);
    })

    beforeEach(async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        sphere = await makeSphere.commit() as visual.Solid;
    })

    describe('commit', () => {
        test('basic union', async () => {
            makeCylinder.targets = [sphere];
            makeCylinder.base = new THREE.Vector3();
            makeCylinder.radius = new THREE.Vector3(0.5, 0, 0);
            makeCylinder.height = new THREE.Vector3(0, 0, 10);
            makeCylinder.operationType = c3d.OperationType.Union;

            const results = await makeCylinder.commit() as visual.SpaceItem[];
            expect(results.length).toBe(1)

            const bbox = new THREE.Box3().setFromObject(results[0]);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 4.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 10));
        })

        test('solid=undefined', async () => {
            makeCylinder.base = new THREE.Vector3();
            makeCylinder.radius = new THREE.Vector3(1, 0, 0);
            makeCylinder.height = new THREE.Vector3(0, 0, 10);
            const items = await makeCylinder.commit() as visual.SpaceItem[];
            expect(items.length).toBe(1)
            const bbox = new THREE.Box3().setFromObject(items[0]);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 10));
        });
    });
});