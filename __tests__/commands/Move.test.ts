import * as THREE from "three";
import { CenterBoxFactory } from "../../src/commands/box/BoxFactory";
import { MoveFactory } from '../../src/commands/translate/TranslateFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let move: MoveFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;
let box: visual.Solid;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    move = new MoveFactory(db, materials, signals);
})

beforeEach(async () => {
    const makeBox = new CenterBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 1, 0);
    makeBox.p3 = new THREE.Vector3(0, 0, 1);
    box = await makeBox.commit() as visual.Solid;
});

test('update when optimizations are possible', async () => {
    move.items = [box];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    expect(box.position).toEqual(new THREE.Vector3(0, 0, 0));
    await move.update();
    expect(box.position).toEqual(new THREE.Vector3(1, 0, 0));
    expect(db.temporaryObjects.children.length).toBe(0);
});

test('update when optimizations are NOT possible', async () => {
    jest.spyOn(db, 'optimization').mockImplementation(
        (from: visual.Item, fast: () => any, slow: () => any) => {
            return slow();
        }
    );

    move.items = [box];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    expect(box.position).toEqual(new THREE.Vector3(0, 0, 0));
    await move.update();
    expect(box.position).toEqual(new THREE.Vector3(0, 0, 0));

    expect(db.temporaryObjects.children.length).toBe(1);

    const temp = db.temporaryObjects.children[0];
    const bbox = new THREE.Box3();
    bbox.setFromObject(temp);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0, 0.5));
});

test('commit', async () => {
    move.items = [box];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    const moveds = await move.commit() as visual.Solid[];
    const bbox = new THREE.Box3();
    bbox.setFromObject(moveds[0]);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0, 0.5));
});

test('update & commit resets position of original visual item', async () => {
    move.items = [box];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    await move.update();
    expect(box.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));

    await move.commit() as visual.Solid[];
    expect(box.position).toApproximatelyEqual(new THREE.Vector3());
})

describe("when no values given it doesn't fail", () => {
    test('update', async () => {
        move.items = [box];
        expect(box.position).toEqual(new THREE.Vector3(0, 0, 0));
        await move.update();
        expect(box.position).toEqual(new THREE.Vector3(0, 0, 0));
    });

    test('commit', async () => {
        move.items = [box];
        await expect(move.commit()).rejects.toThrowError(/no effect/);
    })
})