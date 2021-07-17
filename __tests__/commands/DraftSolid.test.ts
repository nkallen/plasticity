import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import { DraftSolidFactory } from '../../src/commands/modifyface/DraftSolidFactory';
import { EditorSignals } from '../../src/editor/Editor';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let draftSolid: DraftSolidFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    draftSolid = new DraftSolidFactory(db, materials, signals);
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
        const face = solid.faces.get(2);
        draftSolid.solid = solid;
        draftSolid.faces = [face];
        draftSolid.angle = Math.PI / 8;
        draftSolid.axis = new THREE.Vector3(1, 0, 0);
        draftSolid.origin = new THREE.Vector3(0, 0, 0);
        await draftSolid.update();
        expect(db.temporaryObjects.children.length).toBe(1);
    });
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(1);
        const face = solid.faces.get(2);
        draftSolid.solid = solid;
        draftSolid.faces = [face];
        draftSolid.angle = 4.75;
        draftSolid.axis = new THREE.Vector3(1, 0, 0);
        draftSolid.origin = new THREE.Vector3(0.5, 1, 0.5);
        expect(solid).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));
        await draftSolid.update();
        const offsetted = await draftSolid.commit();
        expect(offsetted).toHaveCentroidNear(new THREE.Vector3(0.5, -6.14, 0.73))
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(1);
    })
})