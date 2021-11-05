import * as THREE from "three";
import { ArrayFactory } from "../../src/commands/array/ArrayFactory";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
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

describe(ArrayFactory, () => {
    let array: ArrayFactory;
    let box: visual.Solid;

    beforeEach(() => {
        array = new ArrayFactory(db, materials, signals);
    })

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    })

    test('isPolar = true', async () => {
        array.solid = box;
        array.isPolar = true;
        array.dir1 = new THREE.Vector3(1, 0, 0);
        array.dir2 = new THREE.Vector3(1, 1, 0);
        array.num1 = 5;
        array.num2 = 12;
        array.center = new THREE.Vector3();
        const item = await array.commit() as visual.Solid[];
    });

})
