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
let groups: Groups;
let materials: MaterialDatabase;
let signals: EditorSignals;
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
    groups.validate();
})

test("create & delete", () => {
    expect(groups.all.length).toBe(1);
    const group = groups.create();
    expect(groups.all.length).toBe(2);
    groups.delete(group);
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
    groups.addMembership(nodes.item2key(box), groups.root);
})

test("add item to group", () => {
    const g1 = groups.create();
    expect(groups.groupForNode(nodes.item2key(box))).toEqual(groups.root);
    groups.moveNodeToGroup(nodes.item2key(box), g1);
    expect(groups.groupForNode(nodes.item2key(box))).toEqual(g1);
})

test("add item to group & delete", () => {
    const deleted = jest.fn();
    signals.groupDeleted.add(deleted);
    const g1 = groups.create();
    groups.moveNodeToGroup(nodes.item2key(box), g1);
    expect(groups.groupForNode(nodes.item2key(box))).toEqual(g1);
    groups.delete(g1);
    expect(groups.groupForNode(nodes.item2key(box))).toEqual(groups.root);
    expect(deleted).toBeCalledTimes(1);
    groups.validate();
})

test("add item to group & move", () => {
    const changed = jest.fn(), created = jest.fn();
    signals.groupChanged.add(changed);
    signals.groupCreated.add(created);
    const g1 = groups.create(), g2 = groups.create();
    expect(created).toBeCalledTimes(2);
    groups.moveNodeToGroup(nodes.item2key(box), g1);
    expect(groups.groupForNode(nodes.item2key(box))).toEqual(g1);
    expect(changed).toBeCalledTimes(3);
    groups.moveNodeToGroup(nodes.item2key(box), g2);
    expect(groups.groupForNode(nodes.item2key(box))).toEqual(g2);
    expect(changed).toBeCalledTimes(6);
})

test("list", () => {
    const g1 = groups.create();
    expect(groups.list(g1)).toEqual([]);
    expect(groups.list(groups.root)).toEqual([{ tag: 'Item', id: box.simpleName }, { tag: 'Group', id: g1.id }]);
    groups.moveNodeToGroup(nodes.item2key(box), g1);
    expect(groups.list(groups.root)).toEqual([{ tag: 'Group', id: g1.id }]);
    expect(groups.list(g1)).toEqual([{ tag: 'Item', id: box.simpleName }]);
})

test("walk", () => {
    const g1 = groups.create();
    const g2 = groups.create();
    groups.moveNodeToGroup(nodes.item2key(g2), g1);
    groups.moveNodeToGroup(nodes.item2key(box), g2);
    expect(groups.walk(groups.root)).toEqual([
        { tag: 'Group', id: g1.id },
        { tag: 'Group', id: g2.id },
        { tag: 'Item', id: box.simpleName }
    ]);
})