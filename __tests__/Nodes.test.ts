import * as THREE from 'three';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import FilletFactory from '../src/commands/fillet/FilletFactory';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import { Nodes } from '../src/editor/Nodes';
import { SolidCopier } from '../src/editor/SolidCopier';
import * as visual from '../src/visual_model/VisualModel';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let nodes: Nodes;
let materials: MaterialDatabase;
let signals: EditorSignals;

const points = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(1, 1, 0),
    new THREE.Vector3(1, 1, 1),
]

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    nodes = new Nodes(db, materials, signals);
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

test('isHidden & makeSelectable', () => {
    expect(nodes.isHidden(box)).toBe(false);
    nodes.makeHidden(box, true);
    expect(nodes.isHidden(box)).toBe(true);
})

test('isHidden & makeHidden when object changes', async () => {
    expect(nodes.isHidden(box)).toBe(false);
    nodes.makeHidden(box, true);
    expect(nodes.isHidden(box)).toBe(true);

    const fillet = await filletBox();
    expect(nodes.isHidden(fillet)).toBe(true);
})

test('isSelectable & makeSelectable', () => {
    expect(nodes.isSelectable(box)).toBe(true);
    nodes.makeSelectable(box, false);
    expect(nodes.isSelectable(box)).toBe(false);
})

test('isSelectable & makeSelectable when object changes', async () => {
    expect(nodes.isSelectable(box)).toBe(true);
    nodes.makeSelectable(box, false);
    expect(nodes.isSelectable(box)).toBe(false);

    const makeFillet = new FilletFactory(db, materials, signals);
    const fillet = await filletBox();
    expect(nodes.isSelectable(fillet)).toBe(false);
})

test('isVisible & makeVisible', () => {
    expect(nodes.isVisible(box)).toBe(true);
    nodes.makeVisible(box, false);
    expect(nodes.isVisible(box)).toBe(false);
})

test('isVisible & makeVisible when object changes', async () => {
    expect(nodes.isVisible(box)).toBe(true);
    nodes.makeVisible(box, false);
    expect(nodes.isVisible(box)).toBe(false);

    const fillet = await filletBox();
    expect(nodes.isVisible(fillet)).toBe(false);
})

test('setName & getName', async () => {
    expect(nodes.getName(box)).toBe(undefined);
    nodes.setName(box, "My favorite box");
    expect(nodes.getName(box)).toBe("My favorite box");
})

test('setName & getName when object changes', async () => {
    expect(nodes.getName(box)).toBe(undefined);
    nodes.setName(box, "My favorite box");
    expect(nodes.getName(box)).toBe("My favorite box");

    const fillet = await filletBox();
    expect(nodes.getName(fillet)).toBe("My favorite box");
})

async function filletBox() {
    const makeFillet = new FilletFactory(db, materials, signals);
    makeFillet.solid = box;
    makeFillet.edges = [box.edges.get(0)];
    makeFillet.distance = 0.1;
    const fillet = await makeFillet.commit() as visual.Solid;
    return fillet;
}
