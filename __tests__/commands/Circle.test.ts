import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';
import * as visual from '../../src/VisualModel';
import CircleFactory from "../../src/commands/circle/CircleFactory";

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
    test('invokes the appropriate c3d commands', () => {
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        const item = makeCircle.commit() as visual.SpaceItem;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })
})