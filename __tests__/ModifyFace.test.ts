import * as THREE from "three";
import BoxFactory from "../src/commands/box/Box";
import ModifyFaceFactory from '../src/commands/modifyface/Factory';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let modifyFace: ModifyFaceFactory;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    modifyFace = new ModifyFaceFactory(db, materials, signals);
})

describe('update', () => {
    let solid: visual.Solid;

    beforeEach(() => {
        expect(db.scene.children.length).toBe(0);
        const makeBox = new BoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        makeBox.commit();
        expect(db.scene.children.length).toBe(1);
        solid = db.scene.children[0] as visual.Solid;
        expect(solid).toBeInstanceOf(visual.Solid);
    });

    test('push/pulls the visual face', () => {
        const face = solid.faces.get(0);
        modifyFace.solid = solid;
        modifyFace.faces = [face];
        modifyFace.direction = new THREE.Vector3(0, 0, 1);
        modifyFace.update();
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {

    })
})