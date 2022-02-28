import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { SweepFactory } from "../../src/commands/evolution/SweepFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
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

class MySweepFactory extends SweepFactory { }

let sweep: MySweepFactory;
beforeEach(() => {
    sweep = new MySweepFactory(db, materials, signals);
});

test('center curve', async () => {
    const makeCircle = new CenterCircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3(1, 1, 1);
    makeCircle.radius = 1;
    const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    sweep.curves = [circle];
    expect(sweep.center).toApproximatelyEqual(makeCircle.center);
});

test('center region', async () => {
    const makeCircle = new CenterCircleFactory(db, materials, signals);
    const makeRegion = new RegionFactory(db, materials, signals);

    makeCircle.center = new THREE.Vector3(1, 1, 1);
    makeCircle.radius = 1;
    const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
    makeRegion.contours = [circle];
    const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
    const region = items[0];
    sweep.region = region;
    expect(sweep.center).toApproximatelyEqual(makeCircle.center);
})

test('center face', async () => {
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    const box = await makeBox.commit() as visual.Solid;
    sweep.face = box.faces.get(0);
    expect(sweep.center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
})