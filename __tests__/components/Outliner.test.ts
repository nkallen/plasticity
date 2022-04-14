import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import { Groups } from '../../src/editor/Groups';
import { flatten } from '../../src/components/outliner/FlattenOutline';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { Nodes } from '../../src/editor/Nodes';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import { Scene, SceneDisplayInfo } from '../../src/editor/Scene';

let db: GeometryDatabase;
let nodes: Nodes;
let materials: FakeMaterials;
let signals: EditorSignals;
let scene: Scene;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    nodes = new Nodes(db, materials, signals);
    scene = new Scene(db, materials, signals);
})

const info: SceneDisplayInfo = { visibleItems: new Set(), visibleGroups: new Set() }

test('simple flatten of root and top level group', () => {
    expect(flatten(scene.root, scene, info, new Set())).toEqual([]);
    expect(flatten(scene.root, scene, info, new Set([scene.root.id]))).toEqual([]);
    const g1 = scene.createGroup();
    expect(flatten(scene.root, scene, info, new Set([scene.root.id]))).toEqual([{ tag: "Group", displayed: true, expanded: false, displayed: true, object: g1, indent: 1 }]);
});

test('flatten of nested groups', () => {
    const g1 = scene.createGroup();
    const g2 = scene.createGroup();
    const g3 = scene.createGroup();
    const g4 = scene.createGroup();
    const g5 = scene.createGroup();
    scene.moveToGroup(g3, g2);
    scene.moveToGroup(g4, g2);
    scene.moveToGroup(g5, g3);

    expect(flatten(scene.root, scene, info, new Set())).toEqual([]);
    expect(flatten(scene.root, scene, info, new Set([scene.root.id]))).toEqual([
        { tag: "Group", expanded: false, displayed: true, object: g1, indent: 1 },
        { tag: "Group", expanded: false, displayed: true, object: g2, indent: 1 },
    ]);
    expect(flatten(scene.root, scene, info, new Set([scene.root.id, g1.id]))).toEqual([
        { tag: "Group", expanded: true, displayed: false, object: g1, indent: 1 },
        { tag: "Group", expanded: false, displayed: true, object: g2, indent: 1 },
    ]);
    expect(flatten(scene.root, scene, info, new Set([scene.root.id, g1.id, g2.id]))).toEqual([
        { tag: "Group", expanded: true, displayed: false, object: g1, indent: 1 },
        { tag: "Group", expanded: true, displayed: false, object: g2, indent: 1 },
        { tag: "Group", expanded: false, displayed: true, object: g3, indent: 2 },
        { tag: "Group", expanded: false, displayed: true, object: g4, indent: 2 },
    ]);
    expect(flatten(scene.root, scene, info, new Set([scene.root.id, g1.id, g2.id, g3.id]))).toEqual([
        { tag: "Group", expanded: true, displayed: false, object: g1, indent: 1 },
        { tag: "Group", expanded: true, displayed: false, object: g2, indent: 1 },
        { tag: "Group", expanded: true, displayed: false, object: g3, indent: 2 },
        { tag: "Group", expanded: false, displayed: true, object: g5, indent: 3 },
        { tag: "Group", expanded: false, displayed: true, object: g4, indent: 2 },
    ]);
});