import * as THREE from "three";
import { CenterBoxFactory } from "../../src/commands/box/BoxFactory";
import { RotateFactory } from '../../src/commands/translate/TranslateFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { SolidCopier } from "../../src/editor/SolidCopier";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let rotate: RotateFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let box: visual.Solid;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    rotate = new RotateFactory(db, materials, signals);
})

beforeEach(async () => {
    const makeBox = new CenterBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 1, 0);
    makeBox.p3 = new THREE.Vector3(0, 0, 1);
    box = await makeBox.commit() as visual.Solid;
});

test('update when optimizations are possible', async () => {
    rotate.items = [box];
    rotate.pivot = new THREE.Vector3();
    rotate.axis = new THREE.Vector3(0, 0, 1);
    rotate.angle = Math.PI / 2;
    expect(box).toHaveQuaternion(new THREE.Quaternion(0, 0, 0, 1));
    await rotate.update();
    const result = new THREE.Quaternion().setFromAxisAngle(rotate.axis, rotate.angle);
    expect(box).toHaveQuaternion(result);
});

test('update when optimizations are NOT possible', async () => {
    jest.spyOn(db, 'optimization').mockImplementation(
        (from: visual.Item, fast: () => any, slow: () => any) => {
            return slow();
        }
    );
    
    rotate.items = [box];
    rotate.pivot = new THREE.Vector3();
    rotate.axis = new THREE.Vector3(0, 0, 1);
    rotate.angle = Math.PI / 2;
    expect(box).toHaveQuaternion(new THREE.Quaternion(0, 0, 0, 1));
    await rotate.update();
    expect(box).toHaveQuaternion(new THREE.Quaternion(0, 0, 0, 1));
});

test('commit', async () => {
    expect(box).toHaveCentroidNear(new THREE.Vector3(0, 0, 0.5));

    rotate.items = [box];
    rotate.pivot = new THREE.Vector3();
    rotate.axis = new THREE.Vector3(1, 0, 0);
    rotate.angle = Math.PI;
    const rotated = (await rotate.commit() as visual.Item[])[0];

    expect(rotated).toBeInstanceOf(visual.Solid);
    expect(rotated).toHaveCentroidNear(new THREE.Vector3(0, 0, -0.5));

    expect(db.temporaryObjects.children.length).toBe(0);
    expect(db.visibleObjects.length).toBe(1);
})

test('update & commit resets orientation of original visual item', async () => {
    rotate.items = [box];
    rotate.pivot = new THREE.Vector3();
    rotate.axis = new THREE.Vector3(1, 0, 0);
    rotate.angle = Math.PI;

    await rotate.update();
    const result = new THREE.Quaternion().setFromAxisAngle(rotate.axis, rotate.angle);
    expect(box).toHaveQuaternion(result);

    await rotate.commit();
    expect(box).toHaveQuaternion(new THREE.Quaternion());
})

describe("when no values given it doesn't fail", () => {
    test('update', async () => {
        rotate.items = [box];
        const start = new THREE.Quaternion(0, 0, 0, 1);
        expect(box).toHaveQuaternion(start);
        await rotate.update();
        expect(box).toHaveQuaternion(start);
    });
    
    test('commit', async () => {
        expect(box).toHaveCentroidNear(new THREE.Vector3(0, 0, 0.5));
    
        rotate.items = [box];
        expect(rotate.commit()).rejects.toThrow(/no effect/);
      })
})