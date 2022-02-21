import * as THREE from 'three';
import { ThreePointBoxFactory } from "../../../src/commands/box/BoxFactory";
import { EditorSignals } from "../../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../../src/editor/MaterialDatabase";
import { ParallelMeshCreator } from "../../../src/editor/MeshCreator";
import { SnapIdentityMap } from "../../../src/editor/snaps/SnapIdentityMap";
import { SolidCopier } from '../../../src/editor/SolidCopier';
import * as visual from '../../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../../__mocks__/FakeMaterials";
import '../../matchers';

let db: GeometryDatabase;
let signals: EditorSignals;
let materials: MaterialDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);

});

let identity: SnapIdentityMap;
beforeEach(() => {
    identity = new SnapIdentityMap(db);
});

let box: visual.Solid;

beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(0.5, 0, 0);
    makeBox.p3 = new THREE.Vector3(0.5, 0.5, 0);
    makeBox.p4 = new THREE.Vector3(0.5, 0.5, 0.5);
    box = await makeBox.commit() as visual.Solid;
})

test('factory gives the same objects back every time', () => {
    const view = box.faces.get(0);
    const model = db.lookupTopologyItem(view);

    const faceSnap1 = identity.FaceSnap(view, model);
    const faceSnap2 = identity.FaceSnap(view, model);
    expect(faceSnap1).toBe(faceSnap2);
});

test('lookup', () => {
    const view = box.faces.get(0);
    const model = db.lookupTopologyItem(view);

    const faceSnap1 = identity.FaceSnap(view, model);
    const faceSnap2 = identity.lookup(view);
    expect(faceSnap1).toBe(faceSnap2);
});