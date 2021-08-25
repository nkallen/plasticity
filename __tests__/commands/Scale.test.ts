import * as THREE from "three";
import { CenterBoxFactory } from "../../src/commands/box/BoxFactory";
import { ScaleFactory } from '../../src/commands/translate/TranslateFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let scale: ScaleFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let box: visual.Solid;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    scale = new ScaleFactory(db, materials, signals);
})

beforeEach(async () => {
    const makeBox = new CenterBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 1, 0);
    makeBox.p3 = new THREE.Vector3(0, 0, 1);
    box = await makeBox.commit() as visual.Solid;
});

test('update', async () => {
    scale.items = [box];
    scale.pivot = new THREE.Vector3();
    scale.scale = new THREE.Vector3(2, 2, 2);
    expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
    await scale.update();
    expect(box.scale).toEqual(new THREE.Vector3(2, 2, 2));
});

test('commit', async () => {
    scale.items = [box];
    scale.pivot = new THREE.Vector3();
    scale.scale = new THREE.Vector3(2, 2, 2);
    expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
    const scaleds = await scale.commit() as visual.Solid[];
    const bbox = new THREE.Box3();
    bbox.setFromObject(scaleds[0]);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, -2, 0));
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 2));
});

describe("when no values given it doesn't fail", () => {
    test('update', async () => {
        scale.items = [box];
        await scale.update();
        expect(box.scale).toEqual(new THREE.Vector3(1, 1, 1));
    });
    
    test('commit', async () => {
        scale.items = [box];
        await expect(scale.commit()).rejects.toThrowError(/no effect/);
    });
})