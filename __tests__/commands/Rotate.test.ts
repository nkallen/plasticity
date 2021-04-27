import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import RotateFactory from '../../src/commands/rotate/RotateFactory';
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let rotate: RotateFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    rotate = new RotateFactory(db, materials, signals);
})

describe('update', () => {
    test('rotates the visual object', async () => {
        const item = new visual.Solid();
        rotate.item = item;
        rotate.point = new THREE.Vector3();
        rotate.axis = new THREE.Vector3(0, 0, 1);
        rotate.angle = Math.PI / 2;
        expect(item).toHaveQuaternion(new THREE.Quaternion(0, 0, 0, 1));
        await rotate.update();
        expect(item).toHaveQuaternion(new THREE.Quaternion().setFromAxisAngle(rotate.axis, rotate.angle));
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;

        expect(box).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));

        rotate.item = box;
        rotate.point = new THREE.Vector3();
        rotate.axis = new THREE.Vector3(0, 0, 1);
        rotate.angle = Math.PI / 2;
        const rotated = await rotate.commit();

        expect(rotated).toBeInstanceOf(visual.Solid);
        expect(rotated).toHaveCentroidNear(new THREE.Vector3(-0.5, 0.5, 0.5));
    })
});