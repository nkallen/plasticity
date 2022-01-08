import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterBoxFactory, CornerBoxFactory, PossiblyBooleanCenterBoxFactory, PossiblyBooleanCornerBoxFactory, ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
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

describe(ThreePointBoxFactory, () => {
    let makeBox: ThreePointBoxFactory;

    beforeEach(() => {
        makeBox = new ThreePointBoxFactory(db, materials, signals);
    })

    test('invokes the appropriate c3d commands', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const item = await makeBox.commit() as visual.Solid;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });
});

describe(CornerBoxFactory, () => {
    let makeBox: CornerBoxFactory;
    beforeEach(() => {
        makeBox = new CornerBoxFactory(db, materials, signals);
    })

    test('invokes the appropriate c3d commands', async () => {
        makeBox.p1 = new THREE.Vector3(-1, -1, 0);
        makeBox.p2 = new THREE.Vector3(1, 1, 0);
        makeBox.p3 = new THREE.Vector3(0, 0, 1);

        const item = await makeBox.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
});

describe(CenterBoxFactory, () => {
    let makeBox: CenterBoxFactory;
    beforeEach(() => {
        makeBox = new CenterBoxFactory(db, materials, signals);
    })

    test('invokes the appropriate c3d commands', async () => {
        makeBox.p1 = new THREE.Vector3(0, 0, 0);
        makeBox.p2 = new THREE.Vector3(1, 1, 0);
        makeBox.p3 = new THREE.Vector3(0, 0, 1);

        const item = await makeBox.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
});

describe(PossiblyBooleanCenterBoxFactory, () => {

    describe('with and without an existing solid selected', () => {
        let makeBox: PossiblyBooleanCenterBoxFactory;
        let sphere: visual.Solid;

        beforeEach(async () => {
            const makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3();
            makeSphere.radius = 1;
            sphere = await makeSphere.commit() as visual.Solid;
        })

        beforeEach(() => {
            makeBox = new PossiblyBooleanCenterBoxFactory(db, materials, signals);
        })

        test('basic union', async () => {
            makeBox.target = sphere;
            makeBox.p1 = new THREE.Vector3(0, 0, 0);
            makeBox.p2 = new THREE.Vector3(1, 1, 0);
            makeBox.p3 = new THREE.Vector3(0, 0, 3);
            makeBox.operationType = c3d.OperationType.Union;

            const result = await makeBox.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 3));
        })

        test('solid=undefined', async () => {
            makeBox.p1 = new THREE.Vector3(0, 0, 0);
            makeBox.p2 = new THREE.Vector3(1, 1, 0);
            makeBox.p3 = new THREE.Vector3(0, 0, 1);

            const item = await makeBox.commit() as visual.SpaceItem;
            const bbox = new THREE.Box3().setFromObject(item);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })
    });

    describe('union or intersection depending on direction', () => {
        let box: visual.Solid;
        const bbox = new THREE.Box3()
        const center = new THREE.Vector3();

        beforeEach(async () => {
            const makeBox1 = new PossiblyBooleanCornerBoxFactory(db, materials, signals);
            makeBox1.p1 = new THREE.Vector3(0, 0, 0);
            makeBox1.p2 = new THREE.Vector3(1, 1, 0);
            makeBox1.p3 = new THREE.Vector3(0, 0, 1);
            box = await makeBox1.commit() as visual.Solid;

            bbox.setFromObject(box);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        })

        test.skip('when projecting out, union', async () => {
            const makeBox2 = new PossiblyBooleanCornerBoxFactory(db, materials, signals);
            makeBox2.target = box;
            makeBox2.p1 = new THREE.Vector3(1, 0, 0);
            makeBox2.p2 = new THREE.Vector3(2, 1, 0);
            makeBox2.p3 = new THREE.Vector3(0, 0, 1);
            const item = await makeBox2.commit() as visual.Solid;
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 1, 1));
        })

        test('when projecting in, intersection', async () => {
            const makeBox2 = new PossiblyBooleanCornerBoxFactory(db, materials, signals);
            makeBox2.target = box;
            makeBox2.p1 = new THREE.Vector3(1, 0, 0);
            makeBox2.p2 = new THREE.Vector3(0.5, 1, 0);
            makeBox2.p3 = new THREE.Vector3(0, 0, 1);
            const item = await makeBox2.commit() as visual.Solid;
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.25, 0.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.5, 1, 1));
        })
    })
})


