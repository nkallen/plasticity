import * as THREE from "three";
import MoveFactory from '../src/commands/move/Move';
import SphereFactory from '../src/commands/sphere/Sphere';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let move: MoveFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    move = new MoveFactory(db, materials, signals);
})

describe('update', () => {
    test('moves the visual object', () => {
        const item = new visual.Solid();
        move.item = item;
        move.p1 = new THREE.Vector3();
        move.p2 = new THREE.Vector3(1, 0, 0);
        expect(item.position).toEqual(new THREE.Vector3(0, 0, 0));
        move.update();
        expect(item.position).toEqual(new THREE.Vector3(1, 0, 0));
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {
        expect(db.scene.children.length).toBe(0);
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        makeSphere.commit();
        expect(db.scene.children.length).toBe(1);
        let item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);

        move.item = item;
        move.p1 = new THREE.Vector3();
        move.p2 = new THREE.Vector3(1, 0, 0);
        move.commit();
        item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
    })
})