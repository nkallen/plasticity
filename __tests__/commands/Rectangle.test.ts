import * as THREE from "three";
import { CenterRectangleFactory, CornerRectangleFactory, DiagonalRectangleFactory, ThreePointRectangleFactory } from "../../src/commands/rect/RectangleFactory";
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
            const item = await makeRectangle.commit() as visual.SpaceInstance<visual.Curve3D>;
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
            const item = await makeRectangle.commit() as visual.SpaceInstance<visual.Curve3D>;
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
            const item = await makeRectangle.commit() as visual.SpaceInstance<visual.Curve3D>;
            const bbox = new THREE.Box3().setFromObject(item);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
        })
    })
});

describe(DiagonalRectangleFactory, () => {
    test('#orthogonal -- weird numerical precision edge case', () => {
        const { p1, p2, p3, p4 } = DiagonalRectangleFactory.orthogonal(
            new THREE.Vector3(-1, -1, 1),
            new THREE.Vector3(-1, 1, 2),
            new THREE.Vector3(-0.9999999999999998, 6.123233995736e-17, 0),
        )
        expect(p1).toApproximatelyEqual(new THREE.Vector3(-1, -1, 1));
        expect(p2).toApproximatelyEqual(new THREE.Vector3(-1, 1, 1));
        expect(p3).toApproximatelyEqual(new THREE.Vector3(-1, 1, 2));
        expect(p4).toApproximatelyEqual(new THREE.Vector3(-1, -1, 2));
    })
})