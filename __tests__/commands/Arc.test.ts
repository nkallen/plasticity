import * as THREE from "three";
import { CenterPointArcFactory } from "../../src/commands/arc/ArcFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { SolidCopier } from "../../src/editor/SolidCopier";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), new SolidCopier(), materials, signals);
})

describe(CenterPointArcFactory, () => {
    let makeArc: CenterPointArcFactory;

    beforeEach(() => {
        makeArc = new CenterPointArcFactory(db, materials, signals);
    })

    test('commit', async () => {
        makeArc.center = new THREE.Vector3();
        makeArc.p2 = new THREE.Vector3(-1, 0, 0);
        makeArc.p3 = new THREE.Vector3(0, 1, 0);
        const item = await makeArc.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(-0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
    });

})
