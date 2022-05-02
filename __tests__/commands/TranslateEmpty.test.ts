import * as THREE from "three";
import { MoveEmptyFactory } from "../../src/commands/translate/TranslateEmptyFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { Empties, Empty } from "../../src/editor/Empties";
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Images } from "../../src/editor/Images";
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { Scene } from "../../src/editor/Scene";
import { SolidCopier } from "../../src/editor/SolidCopier";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeImages } from "../../__mocks__/FakeImages";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let scene: Scene;
let images: Images;
let empties: Empties;
let move: MoveEmptyFactory;
let empty: Empty;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    images = new FakeImages();
    empties = new Empties(images, signals);
    scene = new Scene(db, empties, materials, signals);
    move = new MoveEmptyFactory(scene, materials, signals);
})

beforeEach(async () => {
    images.add('foo', Buffer.from(''));
    empty = empties.addImage('foo');
});

test("update updates position matrix world", async () => {
    move.items = [empty];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    expect(empty.position).toEqual(new THREE.Vector3(0, 0, 0));
    await move.update();
    expect(empty.position).toEqual(new THREE.Vector3(1, 0, 0));
    expect(empty.matrixWorld).toEqual(new THREE.Matrix4().set(
        1, 0, 0, 1,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1));
    expect(db.temporaryObjects.children.length).toBe(0);
});

test.skip('commit', async () => {
    move.items = [empty];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    const moveds = await move.commit() as visual.Solid[];
    const bbox = new THREE.Box3();
    bbox.setFromObject(moveds[0]);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0, 0.5));
});

test('update & cancel resets position of original visual item', async () => {
    move.items = [empty];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    await move.update();
    expect(empty.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));

    move.cancel();
    expect(empty.position).toApproximatelyEqual(new THREE.Vector3());
    expect(empty.matrixWorld).toEqual(new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1));
})

test.skip('update & commit resets position of original visual item', async () => {
    move.items = [empty];
    move.pivot = new THREE.Vector3();
    move.move = new THREE.Vector3(1, 0, 0);
    await move.update();
    expect(empty.position).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));

    await move.commit() as visual.Solid[];
    expect(empty.position).toApproximatelyEqual(new THREE.Vector3());
    expect(empty.matrixWorld).toEqual(new THREE.Matrix4().set(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1));
})

describe("when no values given it doesn't fail", () => {
    test.skip('update', async () => {
        move.items = [empty];
        expect(empty.position).toEqual(new THREE.Vector3(0, 0, 0));
        await move.update();
        expect(empty.position).toEqual(new THREE.Vector3(0, 0, 0));
    });

    test('commit', async () => {
        move.items = [empty];
        await expect(move.commit()).rejects.toThrowError(/no effect/);
    })
})