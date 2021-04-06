import * as THREE from "three";
import ScaleFactory from '../src/commands/Scale';
import SphereFactory from '../src/commands/Sphere';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let scale: ScaleFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    scale = new ScaleFactory(db, materials, signals);
})

describe('update', () => {
    test('scales the visual object', () => {
        const item = new visual.Solid();
        scale.item = item;
        scale.origin = new THREE.Vector3();
        scale.p2 = new THREE.Vector3(1, 0, 0);
        scale.p3 = new THREE.Vector3(2, 0, 0);
        expect(item.scale).toEqual(new THREE.Vector3(1, 1, 1));
        scale.update();
        expect(item.scale).toEqual(new THREE.Vector3(2, 2, 2));
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

        const bbox = new THREE.Box3().setFromObject(item);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        scale.item = item;
        scale.origin = new THREE.Vector3();
        scale.p2 = new THREE.Vector3(1, 0, 0);
        scale.p3 = new THREE.Vector3(2, 0, 0);
        scale.commit();
        item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);
        bbox.setFromObject(item);
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, -2));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 2));
    })
})