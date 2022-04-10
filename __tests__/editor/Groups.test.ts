import * as THREE from 'three';
import { ThreePointBoxFactory } from '../../src/commands/box/BoxFactory';
import FilletFactory from '../../src/commands/fillet/FilletFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Groups } from '../../src/editor/Group';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Nodes } from '../../src/editor/Nodes';
import { SolidCopier } from '../../src/editor/SolidCopier';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let nodes: Nodes;
let groups: Groups;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    nodes = new Nodes(db, materials, signals);
    groups = new Groups(db, signals);
})

afterEach(() => {
    groups.validate();
})

test("create & delete", () => {
    expect(groups.all.length).toBe(1);
    const id = groups.create();
    expect(groups.all.length).toBe(2);
    groups.delete(id);
    expect(groups.all.length).toBe(1);
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

test("add item to group", () => {
    const g1 = groups.create();
    expect(groups.groupForNode(box)).toEqual(groups.root);
    groups.moveNodeToGroup(box, g1);
    expect(groups.groupForNode(box)).toEqual(g1);
})

test("add item to group & delete", () => {
    const deleted = jest.fn();
    signals.groupDeleted.add(deleted);
    const g1 = groups.create();
    groups.moveNodeToGroup(box, g1);
    expect(groups.groupForNode(box)).toEqual(g1);
    groups.delete(g1);
    expect(groups.groupForNode(box)).toEqual(groups.root);
    expect(deleted).toBeCalledTimes(1);
    groups.validate();
})

test("add item to group & move", () => {
    const changed = jest.fn(), created = jest.fn();
    signals.groupChanged.add(changed);
    signals.groupCreated.add(created);
    const g1 = groups.create(), g2 = groups.create();
    expect(created).toBeCalledTimes(2);
    groups.moveNodeToGroup(box, g1);
    expect(groups.groupForNode(box)).toEqual(g1);
    expect(changed).toBeCalledTimes(3);
    groups.moveNodeToGroup(box, g2);
    expect(groups.groupForNode(box)).toEqual(g2);
    expect(changed).toBeCalledTimes(6);
})

test("list", () => {
    const g1 = groups.create();
    expect(groups.list(g1)).toEqual([]);
    expect(groups.list(groups.root)).toEqual([{ tag: 'Item', item: box }, { tag: 'Group', group: g1 }]);
    groups.moveNodeToGroup(box, g1);
    expect(groups.list(groups.root)).toEqual([{ tag: 'Group', group: g1 }]);
    expect(groups.list(g1)).toEqual([{ tag: 'Item', item: box }]);
})

test("list when object changes", async () => {
    expect(groups.list(groups.root)).toEqual([{ tag: 'Item', item: box }]);
    const fillet = await filletBox();
    expect(groups.list(groups.root)).toEqual([{ tag: 'Item', item: fillet }]);
})

async function filletBox() {
    const makeFillet = new FilletFactory(db, materials, signals);
    makeFillet.solid = box;
    makeFillet.edges = [box.edges.get(0)];
    makeFillet.distance = 0.1;
    const fillet = await makeFillet.commit() as visual.Solid;
    return fillet;
}
