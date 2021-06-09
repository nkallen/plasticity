import * as THREE from "three";
import CircleFactory from "../../src/commands/circle/CircleFactory";
import RegionFactory from "../../src/commands/region/RegionFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeCircle: CircleFactory;
let makeRegion: RegionFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle = new CircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        makeRegion.contour = circle;
        const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>;
        const item = items[0];

        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })
})