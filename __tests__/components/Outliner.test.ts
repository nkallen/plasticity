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
    expect(flatten(groups.root, groups, new Set())).toEqual([{ tag: "CollapsedGroup", id: 0 }]);
    expect(flatten(groups.root, groups, new Set([groups.root]))).toEqual([{ tag: "ExpandedGroup", id: 0 }]);
});

test('nested flatten', () => {
    const g1 = groups.create();
    const g2 = groups.create();
    const g3 = groups.create();
    const g4 = groups.create();
    const g5 = groups.create();
    groups.moveGroupToGroup(g3, g2);
    groups.moveGroupToGroup(g4, g2);
    groups.moveGroupToGroup(g5, g3);

    expect(flatten(groups.root, groups, new Set())).toEqual([{ tag: "CollapsedGroup", id: 0 }]);
    expect(flatten(groups.root, groups, new Set([groups.root]))).toEqual([
        { tag: "ExpandedGroup", id: 0 },
        { tag: "CollapsedGroup", id: g1 },
        { tag: "CollapsedGroup", id: g2 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root, g1]))).toEqual([
        { tag: "ExpandedGroup", id: groups.root },
        { tag: "ExpandedGroup", id: g1 },
        { tag: "CollapsedGroup", id: g2 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root, g1, g2]))).toEqual([
        { tag: "ExpandedGroup", id: groups.root },
        { tag: "ExpandedGroup", id: g1 },
        { tag: "ExpandedGroup", id: g2 },
        { tag: "CollapsedGroup", id: g3 },
        { tag: "CollapsedGroup", id: g4 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root, g1, g2, g3]))).toEqual([
        { tag: "ExpandedGroup", id: groups.root },
        { tag: "ExpandedGroup", id: g1 },
        { tag: "ExpandedGroup", id: g2 },
        { tag: "ExpandedGroup", id: g3 },
        { tag: "CollapsedGroup", id: g4 },
        { tag: "CollapsedGroup", id: g5 },
    ]);
});