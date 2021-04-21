import * as THREE from "three";
import BoxFactory from "../src/commands/box/Box";
import { OffsetFaceFactory } from '../src/commands/modifyface/ModifyFace';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';
import './matchers';

let db: GeometryDatabase;
let offsetFace: OffsetFaceFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    offsetFace = new OffsetFaceFactory(db, materials, signals);
})


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

describe('update', () => {
    test('push/pulls the visual face', () => {
        const face = solid.faces.get(0);
        offsetFace.solid = solid;
        offsetFace.faces = [face];
        offsetFace.direction = new THREE.Vector3(0, 0, 1);
        offsetFace.update();
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {
        const face = solid.faces.get(0);
        offsetFace.solid = solid;
        offsetFace.faces = [face];
        offsetFace.direction = new THREE.Vector3(0, 0, -1);
        expect(solid).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));
        offsetFace.commit();
        expect(db.scene.children.length).toBe(1);
        let item = db.scene.children[0] as visual.Solid;
        expect(item).toBeInstanceOf(visual.Solid);
        expect(item).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 1))
    })
})