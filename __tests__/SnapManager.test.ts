import * as THREE from "three";
import BoxFactory from '../src/commands/box/BoxFactory';
import LineFactory from "../src/commands/line/LineFactory";
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
let materials: MaterialDatabase;
let sprites: Required<SpriteDatabase>;
let signals: EditorSignals;

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

test("adding solid", async () => {
    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);

    db.removeItem(box);

    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);
});

test("adding & removing curve", async () => {
    const makeLine = new LineFactory(db, materials, signals);
    makeLine.p1 = new THREE.Vector3();
    makeLine.p2 = new THREE.Vector3(1, 0, 0);
    const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

    expect(snaps.snappers.length).toBe(7);
    expect(snaps.pickers.length).toBe(4);

    db.removeItem(line);

    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);
});

test("saveToMemento & restoreFromMemento", async () => {
    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;

    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);

    const memento = snaps.saveToMemento(new Map());

    db.removeItem(box);

    expect(snaps.snappers.length).toBe(4);
    expect(snaps.pickers.length).toBe(1);

    snaps.restoreFromMemento(memento);
    
    expect(snaps.snappers.length).toBe(28);
    expect(snaps.pickers.length).toBe(25);
});