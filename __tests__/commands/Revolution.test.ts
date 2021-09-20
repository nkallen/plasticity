import * as THREE from "three";
import { CenterCircleFactory, Mode, TwoPointCircleFactory } from "../../src/commands/circle/CircleFactory";
import RevolutionFactory from "../../src/commands/evolution/RevolutionFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { PlaneSnap } from "../../src/editor/snaps/Snap";
import * as visual from '../../src/editor/VisualModel';
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

let circle: visual.SpaceInstance<visual.Curve3D>;

beforeEach(async () => {
    const makeCircle = new CenterCircleFactory(db, materials, signals);
    makeCircle.center = new THREE.Vector3(1, 0, 0);
    makeCircle.radius = 0.25;
    circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
})

test('it revolves the object', async () => {
    const makeRevolution = new RevolutionFactory(db, materials, signals);
    makeRevolution.curves = [circle];
    makeRevolution.origin = new THREE.Vector3();
    makeRevolution.axis = new THREE.Vector3(0, 1, 0);
    makeRevolution.thickness = 0.1;
    makeRevolution.side1 = 2 * Math.PI;
    const item = await makeRevolution.commit() as visual.Solid;
    const bbox = new THREE.Box3().setFromObject(item);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3());
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.35, -0.35, -1.35));
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.35, 0.35, 1.35));
});
