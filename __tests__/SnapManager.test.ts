import * as THREE from "three";
import BoxFactory from '../src/commands/box/Box';
import { EditorSignals } from '../src/Editor';
import { GeometryDatabase } from '../src/GeometryDatabase';
import MaterialDatabase from '../src/MaterialDatabase';
import { SnapManager } from '../src/SnapManager';
import { SpriteDatabase } from "../src/SpriteDatabase";
import * as visual from '../src/VisualModel';
import { FakeMaterials, FakeSprites } from "../__mocks__/FakeMaterials";
import FakeSignals from '../__mocks__/FakeSignals';

let db: GeometryDatabase;
let snaps: SnapManager;
let materials: Required<MaterialDatabase>;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;
let box: visual.Solid;

beforeEach(() => {
    materials = new FakeMaterials();
    sprites = new FakeSprites();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    snaps = new SnapManager(db, sprites, signals);
})


test("initial state", () => {
    // the origin and 3 axes
    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);
});

test("adding object", () => {
    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    makeBox.commit();
    expect(db.scene.children.length).toBe(1);
    box = db.scene.children[0] as visual.Solid;
    expect(box).toBeInstanceOf(visual.Solid);

    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);
});
