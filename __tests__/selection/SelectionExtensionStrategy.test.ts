import * as THREE from 'three';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { ParallelMeshCreator } from '../../src/editor/MeshCreator';
import { SolidCopier } from '../../src/editor/SolidCopier';
import { SelectionExtensionStrategy } from '../../src/selection/SelectionExtensionStrategy';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let extend: SelectionExtensionStrategy;
let signals: EditorSignals;
let db: GeometryDatabase;
let materials: MaterialDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    extend = new SelectionExtensionStrategy(db);
})

let solid1: visual.Solid;

beforeEach(async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid1 = await makeBox.commit() as visual.Solid;
});

test("extendEdge no hint", () => {
    const result = extend.extendEdge(solid1.edges.get(0), new Set());
    expect(result.length).toBe(4);
    expect(result[0].simpleName).toBe(solid1.edges.get(0).simpleName);
    expect(result[1].simpleName).toBe(solid1.edges.get(9).simpleName);
    expect(result[2].simpleName).toBe(solid1.edges.get(7).simpleName);
    expect(result[3].simpleName).toBe(solid1.edges.get(11).simpleName);
});


test("extendEdge hint plus", () => {
    const result = extend.extendEdge(solid1.edges.get(0), new Set([solid1.faces.get(0)]));
    expect(result.length).toBe(4);
    expect(result[0].simpleName).toBe(solid1.edges.get(0).simpleName);
    expect(result[1].simpleName).toBe(solid1.edges.get(1).simpleName);
    expect(result[2].simpleName).toBe(solid1.edges.get(2).simpleName);
    expect(result[3].simpleName).toBe(solid1.edges.get(3).simpleName);
});
