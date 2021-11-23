import * as THREE from "three";
import { CenterPointArcFactory } from "../../src/commands/arc/ArcFactory";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { RebuildFactory } from "../../src/commands/rebuild/RebuildFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

let box: visual.Solid;

beforeEach(async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    box = await makeBox.commit() as visual.Solid;
});

describe(RebuildFactory, () => {
    let rebuild: RebuildFactory;

    beforeEach(() => {
        rebuild = new RebuildFactory(db, materials, signals);
    })

    test('commit', async () => {
        rebuild.item = box;
        rebuild.index = 0;
        const result = await rebuild.commit();
        const bbox = new THREE.Box3().setFromObject(box);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    });

})
