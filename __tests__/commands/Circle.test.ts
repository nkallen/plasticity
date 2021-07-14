import * as THREE from "three";
import CircleFactory, { Mode } from "../../src/commands/circle/CircleFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import { PlaneSnap } from "../../src/SnapManager";
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeCircle: CircleFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle = new CircleFactory(db, materials, signals);
})

describe('commit', () => {
    test('mode == Horizontal', async () => {
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        makeCircle.mode = Mode.Horizontal;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });

    test('construction plane', async () => {
        makeCircle.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 1, 0));
        makeCircle.center = new THREE.Vector3();
        makeCircle.point = new THREE.Vector3(0, 0, 1);
        makeCircle.mode = Mode.Horizontal;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
    })

    test('askew', async () => {
        makeCircle.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 1, 0));
        makeCircle.center = new THREE.Vector3();
        makeCircle.point = new THREE.Vector3(Math.SQRT1_2, 0, Math.SQRT1_2);
        makeCircle.mode = Mode.Vertical;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-Math.SQRT1_2, -1, -Math.SQRT1_2));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(Math.SQRT1_2, 1, Math.SQRT1_2));
    })

    test('mode == Vertical', async () => {
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        makeCircle.mode = Mode.Vertical;
        const item = await makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 1));
    })

})