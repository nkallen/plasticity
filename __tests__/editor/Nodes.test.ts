import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import FilletFactory from '../../src/commands/fillet/FilletFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { Empties } from '../../src/editor/Empties';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Groups } from '../../src/editor/Groups';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Nodes } from '../../src/editor/Nodes';
import { SolidCopier } from '../../src/editor/SolidCopier';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let nodes: Nodes;
let materials: MaterialDatabase;
let signals: EditorSignals;
let groups: Groups;
let empties: Empties;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    groups = new Groups(signals);
    empties = new Empties(signals);
    nodes = new Nodes(db, groups, empties, materials, signals);
})

afterEach(() => {
    nodes.validate();
})

let box: visual.Solid;

beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    box = await makeBox.commit() as visual.Solid;
    groups.addMembership(nodes.item2key(box), groups.root);
})

afterEach(() => {
    nodes.validate();
})

test('isHidden & makeSelectable', () => {
    expect(nodes.isHidden(box)).toBe(false);
    nodes.makeHidden(box, true);
    expect(nodes.isHidden(box)).toBe(true);
    db.removeItem(box);
    expect(() => nodes.isHidden(box)).toThrow();
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
    db.removeItem(box);
    expect(() => nodes.isHidden(box)).toThrow();
})

test('isSelectable & makeSelectable when object changes', async () => {
    expect(nodes.isSelectable(box)).toBe(true);
    nodes.makeSelectable(box, false);
    expect(nodes.isSelectable(box)).toBe(false);

    const fillet = await filletBox();
    expect(nodes.isSelectable(fillet)).toBe(false);
})

test('isVisible & makeVisible', () => {
    expect(nodes.isVisible(box)).toBe(true);
    nodes.makeVisible(box, false);
    expect(nodes.isVisible(box)).toBe(false);
    db.removeItem(box);
    expect(() => nodes.isVisible(box)).toThrow();
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
    db.removeItem(box);
    expect(() => nodes.getName(box)).toThrow();
})

test('setName & getName when object changes', async () => {
    expect(nodes.getName(box)).toBe(undefined);
    nodes.setName(box, "My favorite box");
    expect(nodes.getName(box)).toBe("My favorite box");

    const fillet = await filletBox();
    expect(nodes.getName(fillet)).toBe("My favorite box");
});

test('deleting an item deletes the name etc', async () => {
    expect(nodes.getName(box)).toBe(undefined);
    nodes.setName(box, "My favorite box");
    await db.removeItem(box);
});

test('deleting an item deletes the membership', async () => {
    expect(nodes.getName(box)).toBe(undefined);
    const prekey = nodes.item2key(box);
    await db.removeItem(box);
    expect(groups.groupForNode(prekey)).toBe(undefined);
});

test('deleting a group deletes the name etc', async () => {
    const group = groups.create();
    expect(nodes.getName(group)).toBe(undefined);
    nodes.setName(group, "My favorite group");
    expect(nodes.getName(group)).toBe("My favorite group");
    groups.delete(group);
    expect(nodes.getName(group)).toBe(undefined);
});

test('deleting a group deletes the virtual group etc', async () => {
    const group = groups.create();
    expect(nodes.isVisible(group.curves)).toBe(true);
    nodes.makeVisible(group.curves, false);
    expect(nodes.isVisible(group.curves)).toBe(false);
    groups.delete(group);
    expect(nodes.isVisible(group.curves)).toBe(true);
});


async function filletBox() {
    const makeFillet = new FilletFactory(db, materials, signals);
    makeFillet.solid = box;
    makeFillet.edges = [box.edges.get(0)];
    makeFillet.distance = 0.1;
    const fillet = await makeFillet.commit() as visual.Solid;
    return fillet;
}
