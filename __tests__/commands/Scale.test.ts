import * as THREE from "three";
import LineFactory from "../../src/commands/line/LineFactory";
import ScaleFactory from '../../src/commands/scale/ScaleFactory';
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let scale: ScaleFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    scale = new ScaleFactory(db, materials, signals);
})

describe('update', () => {
    test('scales the visual object', async () => {
        const item = new visual.Solid();
        scale.items = [item];
        scale.origin = new THREE.Vector3();
        scale.p2 = new THREE.Vector3(1, 0, 0);
        scale.p3 = new THREE.Vector3(2, 0, 0);
        expect(item.scale).toEqual(new THREE.Vector3(1, 1, 1));
        await scale.update();
        expect(item.scale).toEqual(new THREE.Vector3(2, 2, 2));
    });
});

describe('commit', () => {
    test('solids', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const bbox = new THREE.Box3().setFromObject(sphere);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        scale.items = [sphere];
        scale.origin = new THREE.Vector3();
        scale.p2 = new THREE.Vector3(1, 0, 0);
        scale.p3 = new THREE.Vector3(2, 0, 0);
        const scaleds = await scale.commit() as visual.Solid[];

        for (const scaled of scaleds) bbox.setFromObject(scaled);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, -2));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 2));
    });

    test('curves', async () => {
        const makeLine = new LineFactory(db, materials, signals);
        makeLine.p1 = new THREE.Vector3(-1,-1,-1);
        makeLine.p2 = new THREE.Vector3(1, 1, 1);
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const bbox = new THREE.Box3().setFromObject(line);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        scale.items = [line];
        scale.origin = new THREE.Vector3();
        scale.p2 = new THREE.Vector3(1, 0, 0);
        scale.p3 = new THREE.Vector3(2, 0, 0);
        const scaleds = await scale.commit() as visual.SpaceInstance<visual.Curve3D>[];

        for (const scaled of scaleds) bbox.setFromObject(scaled);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, -2));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 2));
    });
})