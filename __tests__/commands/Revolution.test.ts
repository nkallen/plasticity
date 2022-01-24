import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import JoinCurvesFactory from "../../src/commands/curve/JoinCurvesFactory";
import RevolutionFactory from "../../src/commands/evolution/RevolutionFactory";
import LineFactory from "../../src/commands/line/LineFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';


let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
})

describe("Simple planar curve", () => {
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
})

describe("Composite planar contour", () => {
    let contour: visual.SpaceInstance<visual.Curve3D>;
    
    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        const makeLine2 = new LineFactory(db, materials, signals);
        const makeContour = new JoinCurvesFactory(db, materials, signals);

        makeLine1.p1 = new THREE.Vector3(1, 0, 0);
        makeLine1.p2 = new THREE.Vector3(0, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeLine2.p1 = new THREE.Vector3(1, 0, 0);
        makeLine2.p2 = new THREE.Vector3(0, -1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeContour.push(line1);
        makeContour.push(line2);
        contour = (await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[])[0] as visual.SpaceInstance<visual.Curve3D>;
    })

    test('it works', async () => {
        const makeRevolution = new RevolutionFactory(db, materials, signals);
        makeRevolution.curves = [contour];
        makeRevolution.origin = new THREE.Vector3();
        makeRevolution.axis = new THREE.Vector3(0, 1, 0);
        makeRevolution.thickness = 0.1;
        makeRevolution.side1 = 2 * Math.PI;
        const item = await makeRevolution.commit() as visual.Solid;
        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1.14, -1.14, -1.14));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.14, 1.14, 1.14));
    })
});