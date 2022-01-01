import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { SlotFactory } from "../../src/commands/hole/SlotFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

let box: visual.Solid;
beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    box = await makeBox.commit() as visual.Solid;
})

describe(SlotFactory, () => {
    let slot: SlotFactory;
    beforeEach(() => {
        slot = new SlotFactory(db, materials, signals);
    })

    it('works', async () => {
        expect([...box.faces]).toHaveLength(6);

        slot.face = box.faces.get(0);
        slot.solid = box;
        slot.orientation = new THREE.Quaternion();
        slot.p1 = new THREE.Vector3(0, 0, 0);
        slot.p2 = new THREE.Vector3(0, 1, 0);

        const slotted = await slot.commit() as visual.Solid;
        expect([...slotted.faces]).toHaveLength(9);
    })
})