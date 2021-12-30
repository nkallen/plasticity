import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { MultiOffsetFactory, OffsetFaceFactory } from '../../src/commands/modifyface/OffsetFaceFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
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
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
});

describe(OffsetFaceFactory, () => {
    beforeEach(() => {
        offsetFace = new OffsetFaceFactory(db, materials, signals);
    })

    test('invokes the appropriate c3d commands', async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(1);
        const face = solid.faces.get(0);
        offsetFace.solid = solid;
        offsetFace.faces = [face];
        offsetFace.distance = -1
        expect(solid).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));
        const offsetted = await offsetFace.commit();
        expect(offsetted).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 1));
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(1);
    })
})

describe(MultiOffsetFactory, () => {
    let solid2: visual.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3(10, 10, 0);
        makeBox.p2 = new THREE.Vector3(11, 0, 0);
        makeBox.p3 = new THREE.Vector3(11, 11, 0);
        makeBox.p4 = new THREE.Vector3(11, 11, 11);
        solid2 = await makeBox.commit() as visual.Solid;
    });

    let offset: MultiOffsetFactory;
    beforeEach(() => {
        offset = new MultiOffsetFactory(db, materials, signals);
    })

    test('it works', async () => {
        const face1 = solid.faces.get(0);
        const face2 = solid2.faces.get(0);
        offset.faces = [face1, face2];
        offset.distance = -1;
        const offsetteds = await offset.commit() as visual.Solid[];
        expect(offsetteds.length).toBe(2);

        const first = offsetteds[0];
        expect(first).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 1));
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.visibleObjects.length).toBe(2);
    })
})