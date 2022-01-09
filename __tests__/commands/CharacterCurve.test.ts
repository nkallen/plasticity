import * as THREE from "three";
import { EditorSignals } from '../../src/editor/EditorSignals';
import CharacterCurveFactory from '../../src/commands/character-curve/CharacterCurveFactory';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";

let db: GeometryDatabase;
let makeCurve: CharacterCurveFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    makeCurve = new CharacterCurveFactory(db, materials, signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        makeCurve.tMin = 0;
        makeCurve.tMax = 2*Math.PI;
        makeCurve.xFunction = "1000*cos(t)";
        makeCurve.yFunction = "1000*sin(t)";
        makeCurve.zFunction = "0";

        const item = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-10,-10,0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(10,10,0));
    })
})