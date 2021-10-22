import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import TrimFactory from "../../src/commands/curve/TrimFactory";
import { CornerRectangleFactory } from "../../src/commands/rect/RectangleFactory";
import ContourManager from "../../src/editor/curves/ContourManager";
import { PlanarCurveDatabase } from "../../src/editor/curves/PlanarCurveDatabase";
import { RegionManager } from "../../src/editor/curves/RegionManager";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { inst2curve, point2point } from "../../src/util/Conversion";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let curves: PlanarCurveDatabase;
let regions: RegionManager;
let contours: ContourManager;

const bbox = new THREE.Box3();
const center = new THREE.Vector3();


beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    curves = new PlanarCurveDatabase(db, materials, signals);
    regions = new RegionManager(db, curves);
    contours = new ContourManager(db, curves, regions);
})

describe(TrimFactory, () => {
    let trim: TrimFactory;

    beforeEach(() => {
        trim = new TrimFactory(contours, materials, signals);
    });

    describe('two overlapping circles', () => {
        let circle1: visual.SpaceInstance<visual.Curve3D>;
        let circle2: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeCircle1 = new CenterCircleFactory(contours, materials, signals);
            const makeCircle2 = new CenterCircleFactory(contours, materials, signals);

            await contours.transaction(async () => {
                makeCircle1.center = new THREE.Vector3(0, 0.25, 0);
                makeCircle1.radius = 1;
                circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

                makeCircle2.center = new THREE.Vector3(0, -0.25, 0);
                makeCircle2.radius = 1;
                circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;
            });
        });

        test("it works", async () => {
            expect(db.find(visual.PlaneInstance).length).toBe(1);
            expect(db.find(visual.SpaceInstance).length).toBe(6);
            const { fragments } = curves.lookup(circle1);
            const fragment = await fragments[0];
            trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;

            await contours.transaction(async () => {
                await trim.commit();
            });
            expect(db.find(visual.SpaceInstance).length).toBe(5);
            expect(db.find(visual.PlaneInstance).length).toBe(1);
        });
    });

    describe("polyline", () => {
        describe('open polyline', () => {
            let line: visual.SpaceInstance<visual.Curve3D>;

            beforeEach(async () => {
                const makeLine = new CurveFactory(db, materials, signals);
                makeLine.type = c3d.SpaceType.Polyline3D;
                makeLine.points.push(new THREE.Vector3());
                makeLine.points.push(new THREE.Vector3(0, 1, 0));
                makeLine.points.push(new THREE.Vector3(1, 1, 0));
                makeLine.points.push(new THREE.Vector3(1, 0, 0));
                line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;
                await curves.add(line);

                const model = db.lookup(line);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(4);
                expect(curve.IsClosed()).toBe(false);
            })

            test("fragment=0", async () => {
                const { fragments } = curves.lookup(line);
                const fragment = await fragments[0];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.IsClosed()).toBe(false);
                const points = curve.GetPoints().map(p => point2point(p));
                expect(points.length).toBe(3);
                expect(points[0]).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
                expect(points[1]).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
                expect(points[2]).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
            });

            test("fragment=1", async () => {
                const { fragments } = curves.lookup(line);
                const fragment = await fragments[1];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(2);

                {
                    const model = db.lookup(trimmed[0]);
                    const curve = inst2curve(model) as c3d.Polyline3D;
                    expect(curve.IsClosed()).toBe(false);
                    const points = curve.GetPoints().map(p => point2point(p));
                    expect(points.length).toBe(2);
                    expect(points[0]).toApproximatelyEqual(new THREE.Vector3());
                    expect(points[1]).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
                }
                {
                    const model = db.lookup(trimmed[1]);
                    const curve = inst2curve(model) as c3d.Polyline3D;
                    expect(curve.IsClosed()).toBe(false);
                    const points = curve.GetPoints().map(p => point2point(p));
                    expect(points.length).toBe(2);
                    expect(points[0]).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
                    expect(points[1]).toApproximatelyEqual(new THREE.Vector3(1, 0, 0));
                }
            });

            test("fragment=2", async () => {
                const { fragments } = curves.lookup(line);
                const fragment = await fragments[2];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.IsClosed()).toBe(false);
                const points = curve.GetPoints().map(p => point2point(p));
                expect(points.length).toBe(3);
                expect(points[0]).toApproximatelyEqual(new THREE.Vector3());
                expect(points[1]).toApproximatelyEqual(new THREE.Vector3(0, 1, 0));
                expect(points[2]).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
            });

        });

        describe('closed polyline', () => {
            let rectangle: visual.SpaceInstance<visual.Curve3D>;

            beforeEach(async () => {
                const makeRectangle = new CornerRectangleFactory(db, materials, signals);
                makeRectangle.p1 = new THREE.Vector3(-1, -1, 0);
                makeRectangle.p2 = new THREE.Vector3(1, 1, 0);
                rectangle = await makeRectangle.commit() as visual.SpaceInstance<visual.Curve3D>;
                await curves.add(rectangle);

                bbox.setFromObject(rectangle);
                bbox.getCenter(center);
                expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
                expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
                expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
            })

            test("fragment=0", async () => {
                const { fragments } = curves.lookup(rectangle);
                const fragment = await fragments[0];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(4);
                expect(curve.IsClosed()).toBe(false);
            });

            test("fragment=1", async () => {
                const { fragments } = curves.lookup(rectangle);
                const fragment = await fragments[1];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(4);
                expect(curve.IsClosed()).toBe(false);
            });

            test("fragment=2", async () => {
                const { fragments } = curves.lookup(rectangle);
                const fragment = await fragments[2];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(4);
                expect(curve.IsClosed()).toBe(false);
            });

            test("fragment=3", async () => {
                const { fragments } = curves.lookup(rectangle);
                const fragment = await fragments[3];
                trim.fragment = db.lookupItemById(fragment).view as visual.SpaceInstance<visual.Curve3D>;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(4);
                expect(curve.IsClosed()).toBe(false);
            });

            test('fractional on both sides', async () => {
                trim.curve = rectangle;
                trim.start = 2.3;
                trim.stop = 2.7;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(6);
                expect(curve.IsClosed()).toBe(false);
            })

            test('fractional on first side', async () => {
                trim.curve = rectangle;
                trim.start = 2.3;
                trim.stop = 3;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(5);
                expect(curve.IsClosed()).toBe(false);
            })

            test('fractional on second side', async () => {
                trim.curve = rectangle;
                trim.start = 2;
                trim.stop = 2.7;
                const trimmed = await trim.commit() as visual.SpaceInstance<visual.Curve3D>[];
                expect(trimmed.length).toBe(1);

                const model = db.lookup(trimmed[0]);
                const curve = inst2curve(model) as c3d.Polyline3D;
                expect(curve.GetPoints().length).toBe(5);
                expect(curve.IsClosed()).toBe(false);
            })

        })
    })
});
