import * as THREE from "three";
import RotateFactory from '../src/commands/Rotate';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import BoxFactory from "../src/commands/Box";
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let rotate: RotateFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    rotate = new RotateFactory(db, materials, signals);
})

describe('update', () => {
    test('rotates the visual object', () => {
        const item = new visual.Solid();
        rotate.item = item;
        rotate.point = new THREE.Vector3();
        rotate.axis = new THREE.Vector3(0, 0, 1);
        rotate.angle = Math.PI / 2;
        expect(item).toHaveQuaternion(new THREE.Quaternion(0, 0, 0, 1));
        rotate.update();
        expect(item).toHaveQuaternion(new THREE.Quaternion(0, 0, 1, Math.PI / 2));
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        makeBox.commit();
        expect(db.scene.children.length).toBe(1);
        let item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);

        expect(item).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));

        rotate.item = item;
        rotate.point = new THREE.Vector3();
        rotate.axis = new THREE.Vector3(0, 0, 1);
        rotate.angle = Math.PI / 2;
        rotate.commit();

        item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);
        expect(item).toHaveCentroidNear(new THREE.Vector3(-0.5, 0.5, 0.5));
    })
});