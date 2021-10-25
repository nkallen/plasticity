import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { ModifyContourFactory } from "../../src/commands/modify_contour/ModifyContourFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { inst2curve } from "../../src/util/Conversion";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let modifyContour: ModifyContourFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(async () => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

beforeEach(() => {
    modifyContour = new ModifyContourFactory(db, materials, signals);
})

const center = new THREE.Vector3();
const bbox = new THREE.Box3();

describe('prepare', () => {
    describe('A simple polyline', () => {
        let curve: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(curve)) as c3d.Polyline3D;
            expect(model.IsClosed()).toBe(false);

            bbox.setFromObject(curve);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 2, 0));
        });

        test('it makes segments', async () => {
            const inst = await modifyContour.prepare(curve);
            const contour = inst2curve(inst) as c3d.Contour3D;
            expect(contour.GetSegmentsCount()).toBe(2);
        })
    });

    describe('A trimmed polyline', () => {
        let trimmed: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeCurve = new CurveFactory(db, materials, signals);
            makeCurve.type = c3d.SpaceType.Polyline3D;

            makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
            makeCurve.points.push(new THREE.Vector3(1, 0, 0));
            makeCurve.points.push(new THREE.Vector3(2, 2, 0));
            const polyline = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

            const model = inst2curve(db.lookup(polyline)) as c3d.Polyline3D;
            const foo = new c3d.SpaceInstance(model.Trimmed(0.1, 10, 1)!);
            trimmed = await db.addItem(foo);
        });

        test('it works', async () => {
            const inst = await modifyContour.prepare(trimmed);
            const contour = inst2curve(inst) as c3d.Contour3D;
            expect(contour.GetSegmentsCount()).toBe(2);
        })
    })
})