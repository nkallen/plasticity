import * as THREE from "three";
import LineFactory from "../../src/commands/line/LineFactory";
import MirrorFactory from "../../src/commands/mirror/MirrorFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let mirror: MirrorFactory;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    mirror = new MirrorFactory(db,materials,signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        const makeLine = new LineFactory(db, materials, signals);
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
        mirror.origin = new THREE.Vector3();
        mirror.curve = line;
        mirror.normal = new THREE.Vector3(0,1,0);

        const item = await mirror.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, -0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0,-1,0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1,0,0));

    })
})