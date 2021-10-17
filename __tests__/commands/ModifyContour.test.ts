import * as THREE from "three";
import JoinCurvesFactory from "../../src/commands/curve/JoinCurvesFactory";
import { ModifyContourFactory } from '../../src/commands/curve/ModifyContourFactory';
import LineFactory from '../../src/commands/line/LineFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
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

let modifyContour: ModifyContourFactory;
beforeEach(() => {
    modifyContour = new ModifyContourFactory(db, materials, signals);
});

describe('A triangle', () => {
    let contour: visual.SpaceInstance<visual.Curve3D>;
    const bbox = new THREE.Box3();
    const center = new THREE.Vector3();

    beforeEach(async () => {
        const makeLine1 = new LineFactory(db, materials, signals);
        makeLine1.p1 = new THREE.Vector3();
        makeLine1.p2 = new THREE.Vector3(1, 1, 0);
        const line1 = await makeLine1.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine2 = new LineFactory(db, materials, signals);
        makeLine2.p1 = new THREE.Vector3(1, 1, 0);
        makeLine2.p2 = new THREE.Vector3(0, 1, 0);
        const line2 = await makeLine2.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeLine3 = new LineFactory(db, materials, signals);
        makeLine3.p1 = new THREE.Vector3();
        makeLine3.p2 = new THREE.Vector3(0, 1, 0);
        const line3 = await makeLine3.commit() as visual.SpaceInstance<visual.Curve3D>;

        const makeContour = new JoinCurvesFactory(db, materials, signals);
        makeContour.push(line1);
        makeContour.push(line2);
        makeContour.push(line3);
        const contours = await makeContour.commit() as visual.SpaceInstance<visual.Curve3D>[];
        contour = contours[0];

        bbox.setFromObject(contour);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });

    it('allows offsetting a middle line', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segments = [1];
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
    });

    it('offsetting the first line works', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segments = [0];
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1.207, -0.207, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, -1.414, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2.414, 1, 0));
    });

    it('offsetting the last line works', async () => {
        modifyContour.contour = contour;
        modifyContour.distance = 1;
        modifyContour.segments = [2];
        const result = await modifyContour.commit() as visual.SpaceInstance<visual.Curve3D>;

        bbox.setFromObject(result);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    });
})