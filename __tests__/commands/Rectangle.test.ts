import * as THREE from "three";
import { CenterRectangleFactory, CornerRectangleFactory, ThreePointRectangleFactory } from "../../src/commands/rect/RectangleFactory";
import { EditorSignals } from '../../src/editor/Editor';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
})

describe(ThreePointRectangleFactory, () => {
    let makeRectangle: ThreePointRectangleFactory;

    beforeEach(() => {
        makeRectangle = new ThreePointRectangleFactory(db, materials, signals);
    })

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            makeRectangle.p1 = new THREE.Vector3();
            makeRectangle.p2 = new THREE.Vector3(1, 0, 0);
            makeRectangle.p3 = new THREE.Vector3(1, 1, 0);
            const item = await makeRectangle.commit() as visual.SpaceItem;
            const bbox = new THREE.Box3().setFromObject(item);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        })
    })
});

describe(CornerRectangleFactory, () => {
    let makeRectangle: CornerRectangleFactory;

    beforeEach(() => {
        makeRectangle = new CornerRectangleFactory(db, materials, signals);
    })

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            makeRectangle.p1 = new THREE.Vector3(-1, -1, -1);
            makeRectangle.p2 = new THREE.Vector3(1, 1, 1);
            const item = await makeRectangle.commit() as visual.SpaceItem;
            const bbox = new THREE.Box3().setFromObject(item);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })
    })

});

describe(CenterRectangleFactory, () => {
    let makeRectangle: CenterRectangleFactory;

    beforeEach(() => {
        makeRectangle = new CenterRectangleFactory(db, materials, signals);
    })

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            makeRectangle.p1 = new THREE.Vector3(0, 0, 0);
            makeRectangle.p2 = new THREE.Vector3(1, 1, 1);
            const item = await makeRectangle.commit() as visual.SpaceItem;
            const bbox = new THREE.Box3().setFromObject(item);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })
    })

});