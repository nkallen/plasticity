import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { MirrorFactory, MultiSymmetryFactory, SymmetryFactory } from "../../src/commands/mirror/MirrorFactory";
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

const bbox = new THREE.Box3();
const center = new THREE.Vector3();

describe(MirrorFactory, () => {
    let mirror: MirrorFactory;

    beforeEach(() => {
        mirror = new MirrorFactory(db, materials, signals);
    })

    test('curves', async () => {
        const makeLine = new LineFactory(db, materials, signals);
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
        mirror.origin = new THREE.Vector3();
        mirror.item = line;
        mirror.normal = new THREE.Vector3(0, 1, 0);

        const item = await mirror.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, -0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
    })

    describe('solids', () => {
        let box: visual.Solid;
        beforeEach(async () => {
            const makeBox = new ThreePointBoxFactory(db, materials, signals);
            makeBox.p1 = new THREE.Vector3();
            makeBox.p2 = new THREE.Vector3(1, 0, 0);
            makeBox.p3 = new THREE.Vector3(1, 1, 0);
            makeBox.p4 = new THREE.Vector3(1, 1, 1);
            box = await makeBox.commit() as visual.Solid;

            bbox.setFromObject(box);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })

        test('move=0', async () => {
            mirror.origin = new THREE.Vector3();
            mirror.item = box;
            mirror.normal = new THREE.Vector3(0, 1, 0);

            const item = await mirror.commit() as visual.SpaceInstance<visual.Curve3D>;
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, -0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
        })
    })
})

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

describe(SymmetryFactory, () => {
    let mirror: SymmetryFactory;
    let sphere: visual.Solid;

    beforeEach(async () => {
        mirror = new SymmetryFactory(db, materials, signals);
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0.5, 0, 0);
        makeSphere.radius = 1;
        sphere = await makeSphere.commit() as visual.Solid;
    })

    test('commit', async () => {
        mirror.solid = sphere;
        mirror.origin = new THREE.Vector3();
        mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
        mirror.shouldCut = true;
        mirror.shouldUnion = true;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(1);
        const item = items[0];
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));

        expect(db.visibleObjects.length).toBe(1);
    });

    test('update', async () => {
        mirror.solid = sphere;
        mirror.origin = new THREE.Vector3(0, 0, 0);
        mirror.normal = new THREE.Vector3(1, 0, 0);

        await mirror.update();
        expect(db.temporaryObjects.children.length).toBe(1);

        const item = db.temporaryObjects.children[0];

        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.5, -0.86, -0.86));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.5, 0.86, 0.86));

        expect(db.visibleObjects.length).toBe(1);
    });

    test('solids cut=false, union=false', async () => {
        mirror.origin = new THREE.Vector3();
        mirror.solid = sphere;
        mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
        mirror.shouldCut = false;
        mirror.shouldUnion = false;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(1);
        const item = items[0];
        expect(db.visibleObjects.length).toBe(2);
        bbox.setFromObject(item);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.5, 1, 1));
    })

    test('solids cut=true, union=true', async () => {
        mirror.origin = new THREE.Vector3();
        mirror.solid = sphere;
        mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
        mirror.shouldCut = true;
        mirror.shouldUnion = true;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(1);
        const item = items[0];
        expect(db.visibleObjects.length).toBe(1);
        bbox.setFromObject(item);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));
    })

    describe('when the cut has no effect', () => {
        let box: visual.Solid;

        beforeEach(async () => {
            const makeBox = new ThreePointBoxFactory(db, materials, signals);
            makeBox.p1 = new THREE.Vector3();
            makeBox.p2 = new THREE.Vector3(1, 0, 0);
            makeBox.p3 = new THREE.Vector3(1, 1, 0);
            makeBox.p4 = new THREE.Vector3(1, 1, 1);
            box = await makeBox.commit() as visual.Solid;
        })

        test('commit: solids cut=true, union=true', async () => {
            mirror.origin = new THREE.Vector3();
            mirror.solid = box;
            mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
            mirror.shouldCut = true;
            mirror.shouldUnion = true;

            const items = await mirror.commit() as visual.Solid[];
            expect(items.length).toBe(1);
            const item = items[0];
            expect(db.visibleObjects.length).toBe(2);
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })

        test('update: solids cut=true, union=true', async () => {
            mirror.origin = new THREE.Vector3();
            mirror.solid = box;
            mirror.normal = new THREE.Vector3(Math.SQRT1_2, -Math.SQRT1_2, 0);
            mirror.shouldCut = true;
            mirror.shouldUnion = true;

            await mirror.update();
            expect(db.temporaryObjects.children.length).toBe(1);
            const item = db.temporaryObjects.children[0];

            expect(db.visibleObjects.length).toBe(2);
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })
    })


    test('solids cut=false, union=true', async () => {
        mirror.origin = new THREE.Vector3();
        mirror.solid = sphere;
        mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
        mirror.shouldCut = false;
        mirror.shouldUnion = true;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(1);
        const item = items[0];
        expect(db.visibleObjects.length).toBe(1);
        bbox.setFromObject(item);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));
    })

    test('solids cut=true, union=false', async () => {
        mirror.origin = new THREE.Vector3();
        mirror.solid = sphere;
        mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
        mirror.shouldCut = true;
        mirror.shouldUnion = false;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(2);
        expect(db.visibleObjects.length).toBe(2);

        const item0 = items[0];
        bbox.setFromObject(item0);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.75, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));

        const item1 = items[1];
        bbox.setFromObject(item1);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(-0.75, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0, 1, 1));
    })

    test('move!=0', async () => {
        mirror.origin = new THREE.Vector3();
        mirror.solid = sphere;
        mirror.quaternion = new THREE.Quaternion().setFromUnitVectors(Z, X);
        mirror.shouldCut = true;
        mirror.shouldUnion = false;
        mirror.move = -0.1;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(2);
        expect(db.visibleObjects.length).toBe(2);

        const item0 = items[0];
        bbox.setFromObject(item0);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.725, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.05, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));

        const item1 = items[1];
        bbox.setFromObject(item1);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(-0.825, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.6, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(-0.05, 1, 1));
    })
});


describe(MultiSymmetryFactory, () => {
    let mirror: MultiSymmetryFactory;

    beforeEach(async () => {
        mirror = new MultiSymmetryFactory(db, materials, signals);
    })

    let box: visual.Solid;
    let sphere: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0.5, 0, 0);
        makeSphere.radius = 1;
        sphere = await makeSphere.commit() as visual.Solid;
    })

    test('multiple items (solids cut=true, union=true)', async () => {
        mirror.solids = [sphere, box];
        mirror.origin = new THREE.Vector3();
        mirror.normal = new THREE.Vector3(0, 1, 0);
        mirror.shouldCut = true;
        mirror.shouldUnion = true;

        const items = await mirror.commit() as visual.Solid[];
        expect(items.length).toBe(2);
        expect(db.visibleObjects.length).toBe(2);
        bbox.setFromObject(items[0]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));

        bbox.setFromObject(items[1]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
});