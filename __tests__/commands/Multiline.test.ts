import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import CurveFactory from "../../src/commands/curve/CurveFactory";
import MultilineFactory from "../../src/commands/multiline/MultilineFactory";
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

let polyline: visual.SpaceInstance<visual.Curve3D>;

beforeEach(async () => {
    const makePolyline = new CurveFactory(db, materials, signals);
    makePolyline.type = c3d.SpaceType.Polyline3D;
    makePolyline.points.push(new THREE.Vector3());
    makePolyline.points.push(new THREE.Vector3(1, 1, 0));
    makePolyline.points.push(new THREE.Vector3(2, -1, 0));
    makePolyline.points.push(new THREE.Vector3(3, 1, 0));
    makePolyline.points.push(new THREE.Vector3(4, -1, 0));
    polyline = await makePolyline.commit() as visual.SpaceInstance<visual.Curve3D>;
});

test("it works", async () => {
    const makeMultiline = new MultilineFactory(db, materials, signals);
    makeMultiline.curve = polyline;
    const multi = await makeMultiline.commit() as visual.SpaceInstance<visual.Curve3D>;

    const bbox = new THREE.Box3();
    bbox.setFromObject(multi);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    expect(center).toApproximatelyEqual(new THREE.Vector3(2, 0, 0));
    expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.1, -1.223, 0));
    expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(4.1, 1.223, 0));
})