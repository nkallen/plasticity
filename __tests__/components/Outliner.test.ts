import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Groups } from '../../src/editor/Group';
import { flatten } from '../../src/components/outliner/FlattenOutline';
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

test.skip('simple flatten of root and top level group', () => {
    expect(flatten(groups.root, groups, new Set())).toEqual([]);
    expect(flatten(groups.root, groups, new Set([groups.root.id]))).toEqual([]);
    const g1 = groups.create();
    expect(flatten(groups.root, groups, new Set([groups.root.id]))).toEqual([{ tag: "Group", expanded: false, object: g1, indent: 1 }]);
});

test.skip('flatten of nested groups', () => {
    const g1 = groups.create();
    const g2 = groups.create();
    const g3 = groups.create();
    const g4 = groups.create();
    const g5 = groups.create();
    groups.moveNodeToGroup(g3, g2);
    groups.moveNodeToGroup(g4, g2);
    groups.moveNodeToGroup(g5, g3);

    expect(flatten(groups.root, groups, new Set())).toEqual([]);
    expect(flatten(groups.root, groups, new Set([groups.root.id]))).toEqual([
        { tag: "Group", expanded: false, object: g1, indent: 1 },
        { tag: "Group", expanded: false, object: g2, indent: 1 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root.id, g1.id]))).toEqual([
        { tag: "Group", expanded: true, object: g1, indent: 1 },
        { tag: "Group", expanded: false, object: g2, indent: 1 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root.id, g1.id, g2.id]))).toEqual([
        { tag: "Group", expanded: true, object: g1, indent: 1 },
        { tag: "Group", expanded: true, object: g2, indent: 1 },
        { tag: "Group", expanded: false, object: g3, indent: 2 },
        { tag: "Group", expanded: false, object: g4, indent: 2 },
    ]);
    expect(flatten(groups.root, groups, new Set([groups.root.id, g1.id, g2.id, g3.id]))).toEqual([
        { tag: "Group", expanded: true, object: g1, indent: 1 },
        { tag: "Group", expanded: true, object: g2, indent: 1 },
        { tag: "Group", expanded: true, object: g3, indent: 2 },
        { tag: "Group", expanded: false, object: g5, indent: 3 },
        { tag: "Group", expanded: false, object: g4, indent: 2 },
    ]);
});