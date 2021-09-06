import * as THREE from "three";
import LineFactory from "../../src/commands/line/LineFactory";
import { MirrorFactory, SymmetryFactory } from "../../src/commands/mirror/MirrorFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let mirror: MirrorFactory;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    mirror = new MirrorFactory(db, materials, signals);
})

describe(MirrorFactory, () => {
    let mirror: MirrorFactory;

    beforeEach(() => {
        mirror = new MirrorFactory(db, materials, signals);
    })

    test('curves', async () => {
        const makeLine = new LineFactory(db, materials, signals);
        makeLine.p1 = new THREE.Vector3();
        makeLine.p2 = new THREE.Vector3(1, 1, 0);
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
        mirror.origin = new THREE.Vector3();
        mirror.curve = line;
        mirror.normal = new THREE.Vector3(0, 1, 0);

        const item = await mirror.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, -0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
    })
})

const X = new THREE.Vector3(1, 0, 0);
const Z = new THREE.Vector3(0, 0, 1);

describe(SymmetryFactory, () => {
    let symmetry: SymmetryFactory;

    beforeEach(() => {
        symmetry = new SymmetryFactory(db, materials, signals);
    })

    test('commit', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0.5, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        symmetry.solid = sphere;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(Z, X);

        const item = await symmetry.commit() as visual.SpaceInstance<visual.Curve3D>;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));

        expect(db.visibleObjects.length).toBe(1);
    });

    test('update', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0.5, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        symmetry.solid = sphere;
        symmetry.origin = new THREE.Vector3();
        symmetry.orientation = new THREE.Quaternion().setFromUnitVectors(Z, X);

        await symmetry.update();
        expect(db.temporaryObjects.children.length).toBe(1);

        const item = db.temporaryObjects.children[0];

        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.5, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));

        expect(db.visibleObjects.length).toBe(1);
    });
});