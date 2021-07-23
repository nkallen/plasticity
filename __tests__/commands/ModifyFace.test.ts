import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import { OffsetFaceFactory } from '../../src/commands/modifyface/ModifyFaceFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let offsetFace: OffsetFaceFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    offsetFace = new OffsetFaceFactory(db, materials, signals);
})


let solid: visual.Solid;

beforeEach(async () => {
    const makeBox = new BoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
});

describe('update', () => {
    test('push/pulls the visual face', async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        const face = solid.faces.get(0);
        offsetFace.solid = solid;
        offsetFace.faces = [face];
        offsetFace.direction = new THREE.Vector3(0, 0, 1);
        await offsetFace.update();
        expect(db.temporaryObjects.children.length).toBe(1);
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(1);
        const face = solid.faces.get(0);
        offsetFace.solid = solid;
        offsetFace.faces = [face];
        offsetFace.direction = new THREE.Vector3(0, 0, -1);
        expect(solid).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));
        const offsetted = await offsetFace.commit();
        expect(offsetted).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 1));
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(1);
    })
})