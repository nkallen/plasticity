import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { flatten, Groups } from '../../src/editor/Group';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Nodes } from '../../src/editor/Nodes';
import { SolidCopier } from '../../src/editor/SolidCopier';
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

test('simple flatten', () => {
    expect(flatten(groups.root, groups, new Set())).toEqual([{ tag: "CollapsedGroup", group: groups.root, indent: 0 }]);
    expect(flatten(groups.root, groups, new Set([groups.root.id]))).toEqual([{ tag: "ExpandedGroup", group: groups.root, indent: 0 }]);
});

test('nested flatten', () => {
    const g1 = groups.create();
    const g2 = groups.create();
    const g3 = groups.create();
    const g4 = groups.create();
    const g5 = groups.create();
    groups.moveNodeToGroup(g3, g2);
    groups.moveNodeToGroup(g4, g2);
    groups.moveNodeToGroup(g5, g3);

    expect(flatten(groups.root, groups, new Set())).toEqual([{ tag: "CollapsedGroup", group: groups.root, indent: 0 }]);
    expect(flatten(groups.root, groups, new Set([groups.root.id]))).toEqual([
        { tag: "ExpandedGroup", group: groups.root, indent: 0 },
        { tag: "CollapsedGroup", group: g1, indent: 1 },
        { tag: "CollapsedGroup", group: g2, indent: 1 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root.id, g1.id]))).toEqual([
        { tag: "ExpandedGroup", group: groups.root, indent: 0 },
        { tag: "ExpandedGroup", group: g1, indent: 1 },
        { tag: "CollapsedGroup", group: g2, indent: 1 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root.id, g1.id, g2.id]))).toEqual([
        { tag: "ExpandedGroup", group: groups.root, indent: 0 },
        { tag: "ExpandedGroup", group: g1, indent: 1 },
        { tag: "ExpandedGroup", group: g2, indent: 1 },
        { tag: "CollapsedGroup", group: g3, indent: 2 },
        { tag: "CollapsedGroup", group: g4, indent: 2 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root.id, g1.id, g2.id, g3.id]))).toEqual([
        { tag: "ExpandedGroup", group: groups.root, indent: 0 },
        { tag: "ExpandedGroup", group: g1, indent: 1 },
        { tag: "ExpandedGroup", group: g2, indent: 1 },
        { tag: "ExpandedGroup", group: g3, indent: 2 },
        { tag: "CollapsedGroup", group: g5, indent: 3 },
        { tag: "CollapsedGroup", group: g4, indent: 2 },
    ]);
});