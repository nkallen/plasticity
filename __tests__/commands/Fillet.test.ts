import * as THREE from "three";
import BoxFactory from "../../src/commands/box/BoxFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';
import * as visual from '../../src/VisualModel';
import FilletFactory from "../../src/commands/fillet/FilletFactory";

let db: GeometryDatabase;
let makeBox: BoxFactory;
let makeFillet: FilletFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeBox = new BoxFactory(db, materials, signals);
    makeFillet = new FilletFactory(db, materials, signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        makeFillet.item = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.1;
        makeFillet.commit();
    })
})

describe('async', () => {
    test('invokes the appropriate c3d commands', async () => {
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = makeBox.commit() as visual.Solid;
        const edge = box.edges.get(0);

        makeFillet.item = box;
        makeFillet.edges = [edge];
        makeFillet.distance = 0.01;
        await makeFillet.doUpdate2();
    })
})