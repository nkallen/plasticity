import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import LoftFactory from "../../src/commands/loft/LoftFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let loft: LoftFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    loft = new LoftFactory(db, materials, signals);
})

describe('commit', () => {
    test('invokes the appropriate c3d commands', async () => {
        const makeCircle1 = new CenterCircleFactory(db, materials, signals);
        makeCircle1.center = new THREE.Vector3();
        makeCircle1.radius = 1;
        const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeCircle2 = new CenterCircleFactory(db, materials, signals);
        makeCircle2.center = new THREE.Vector3(0, 0, 1);
        makeCircle2.radius = 3;
        const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeCircle3 = new CenterCircleFactory(db, materials, signals);
        makeCircle3.center = new THREE.Vector3(0, 0, 2);
        makeCircle3.radius = 2;
        const circle3 = await makeCircle3.commit() as visual.SpaceInstance<visual.Curve3D>;

        loft.curves = [circle1, circle2, circle3];

        const result = await loft.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-3, -3, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(3, 3, 2));

    })
})