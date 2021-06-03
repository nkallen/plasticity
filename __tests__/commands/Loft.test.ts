import * as THREE from "three";
import CircleFactory from "../../src/commands/circle/CircleFactory";
import LoftFactory from "../../src/commands/loft/LoftFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let loft: LoftFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    loft = new LoftFactory(db, materials, signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        const makeCircle1 = new CircleFactory(db, materials, signals);
        makeCircle1.center = new THREE.Vector3();
        makeCircle1.radius = 1;
        const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeCircle2 = new CircleFactory(db, materials, signals);
        makeCircle2.center = new THREE.Vector3(0,0,1);
        makeCircle2.radius = 3;
        const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeCircle3 = new CircleFactory(db, materials, signals);
        makeCircle3.center = new THREE.Vector3(0,0,2);
        makeCircle3.radius = 2;
        const circle3 = await makeCircle3.commit() as visual.SpaceInstance<visual.Curve3D>;

        loft.contours = [circle1, circle2, circle3];
        const result = await loft.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0,0,1));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-3, -3, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 2));

    })
})