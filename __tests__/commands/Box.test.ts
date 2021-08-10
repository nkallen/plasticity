import * as THREE from "three";
import { CenterBoxFactory, CornerBoxFactory, ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
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
        const item = await makeBox.commit() as visual.SpaceItem;
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

    test.only('invokes the appropriate c3d commands', async () => {
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

