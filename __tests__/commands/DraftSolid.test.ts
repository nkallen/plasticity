import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { DraftSolidFactory } from '../../src/commands/modifyface/DraftSolidFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { SolidCopier } from "../../src/editor/SolidCopier";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let draftSolid: DraftSolidFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
    draftSolid = new DraftSolidFactory(db, materials, signals);
})

let solid: visual.Solid;

beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
});

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.items.length).toBe(1);
        expect(solid).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5))

        const face = solid.faces.get(5);
        draftSolid.solid = solid;
        draftSolid.faces = [face];
        draftSolid.degrees = 45;
        draftSolid.axis = new THREE.Vector3(0, 1, 0);
        draftSolid.pivot = new THREE.Vector3(0.5, 0.5, 0.5);
        draftSolid.normal = new THREE.Vector3(1, 0, 0);
        expect(solid).toHaveCentroidNear(new THREE.Vector3(0.5, 0.5, 0.5));
        const drafted = await draftSolid.commit();
        expect(drafted).toHaveCentroidNear(new THREE.Vector3(0.25, 0.5, 0.5))
        expect(db.temporaryObjects.children.length).toBe(0);
        expect(db.items.length).toBe(1);
    })
})