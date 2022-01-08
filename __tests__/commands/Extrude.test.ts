import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import { CurveExtrudeFactory, FaceExtrudeFactory, PossiblyBooleanExtrudeFactory, RegionExtrudeFactory } from "../../src/commands/extrude/ExtrudeFactory";
import { ExtrudeSurfaceFactory } from "../../src/commands/extrude/ExtrudeSurfaceFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
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

describe(CurveExtrudeFactory, () => {
    let extrude: CurveExtrudeFactory;
    beforeEach(() => {
        extrude = new CurveExtrudeFactory(db, materials, signals);
    });

    test('invokes the appropriate c3d commands', async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

        extrude.curves = [circle];
        extrude.distance1 = 1;
        extrude.distance2 = 1;
        const result = await extrude.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
})

describe(RegionExtrudeFactory, () => {
    let extrude: RegionExtrudeFactory;
    beforeEach(() => {
        extrude = new RegionExtrudeFactory(db, materials, signals);
    });

    test('invokes the appropriate c3d commands', async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        const makeRegion = new RegionFactory(db, materials, signals);

        makeCircle.center = new THREE.Vector3();
        makeCircle.radius = 1;
        const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        makeRegion.contours = [circle];
        const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
        const region = items[0];

        extrude.region = region;
        extrude.distance1 = 1;
        extrude.distance2 = 1;
        const result = await extrude.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));
    })
})

describe(FaceExtrudeFactory, () => {
    let extrude: FaceExtrudeFactory;
    beforeEach(() => {
        extrude = new FaceExtrudeFactory(db, materials, signals);
    });

    let box: visual.Solid;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;
    });

    test('invokes the appropriate c3d commands to create a new body', async () => {
        extrude.face = box.faces.get(0);
        extrude.distance1 = 0.2;
        const result = await extrude.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, -0.1));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, -0.2));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));

        expect(extrude.originalItem).toBeUndefined();

        expect(db.visibleObjects.length).toBe(2);
    })

    test('faces automatically set the boolean operation type based on direction', async () => {
        extrude.face = box.faces.get(1);
        extrude.target = box;
        extrude.distance1 = 0.2;
        expect(extrude.operationType).toBe(c3d.OperationType.Union);
        extrude.distance1 = -0.2;
        expect(extrude.operationType).toBe(c3d.OperationType.Difference);
        const result = await extrude.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.4));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0.8));

        expect(extrude.originalItem).toBe(box);

        expect(db.visibleObjects.length).toBe(1);
    });
})

describe(PossiblyBooleanExtrudeFactory, () => {
    let extrude: PossiblyBooleanExtrudeFactory;
    let region: visual.PlaneInstance<visual.Region>;
    let sphere: visual.Solid;

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        const makeRegion = new RegionFactory(db, materials, signals);
        const makeSphere = new SphereFactory(db, materials, signals);

        makeCircle.center = new THREE.Vector3(0, 0, 2);
        makeCircle.radius = 0.1;
        const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeRegion.contours = [circle];
        const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>[];
        region = items[0];

        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        sphere = await makeSphere.commit() as visual.Solid;

        expect(db.visibleObjects.length).toBe(3);
    });

    describe('region', () => {
        beforeEach(() => {
            const factory = new RegionExtrudeFactory(db, materials, signals);
            const phantom = new RegionExtrudeFactory(db, materials, signals);
            factory.region = phantom.region = region;
            extrude = new PossiblyBooleanExtrudeFactory(factory, phantom);
        });

        test('basic union', async () => {
            extrude.target = sphere;
            extrude.distance1 = 0;
            extrude.distance2 = 1.5;
            extrude.operationType = c3d.OperationType.Union;
            const result = await extrude.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 2));

            expect(db.visibleObjects.length).toBe(3);
        })

        test('newBody=true', async () => {
            extrude.target = sphere;
            extrude.distance1 = 0;
            extrude.distance2 = 1.5;
            extrude.newBody = true;
            extrude.operationType = c3d.OperationType.Union;
            const result = await extrude.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1.25));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.1, -0.1, 0.5));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.1, 0.1, 2));

            expect(db.visibleObjects.length).toBe(4);
        })

        test('solid=undefined', async () => {
            extrude.distance1 = 0;
            extrude.distance2 = 1.5;
            extrude.operationType = c3d.OperationType.Union;
            const result = await extrude.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1.25));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.1, -0.1, 0.5));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.1, 0.1, 2));

            expect(db.visibleObjects.length).toBe(4);
        })

        test('basic difference', async () => {
            extrude.target = sphere;
            extrude.distance1 = 0;
            extrude.distance2 = 1.5;
            extrude.operationType = c3d.OperationType.Difference;
            const result = await extrude.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, -1));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

            expect(db.visibleObjects.length).toBe(3);
        })
        
        describe('phantom', () => {
            test('basic difference', async () => {
                extrude.target = sphere;
                extrude.distance1 = 0;
                extrude.distance2 = 1.5;
                extrude.operationType = c3d.OperationType.Difference;
                await extrude.calculate();
                const phantoms = await extrude.calculatePhantoms();
                const { phantom } = phantoms[0];
                const result = await db.addItem(phantom);
    
                const bbox = new THREE.Box3().setFromObject(result);
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                expect(center).toApproximatelyEqual(new THREE.Vector3(0, 0, 1.25));
                expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.1, -0.1, 0.5));
                expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.1, 0.1, 2));
            })
        });
    })

    describe("face", () => {
        let box: visual.Solid;

        beforeEach(async () => {
            const makeBox = new ThreePointBoxFactory(db, materials, signals);
            makeBox.p1 = new THREE.Vector3();
            makeBox.p2 = new THREE.Vector3(1, 0, 0);
            makeBox.p3 = new THREE.Vector3(1, 1, 0);
            makeBox.p4 = new THREE.Vector3(1, 1, 1);
            box = await makeBox.commit() as visual.Solid;
        });

        beforeEach(() => {
            const factory = new FaceExtrudeFactory(db, materials, signals);
            const phantom = new FaceExtrudeFactory(db, materials, signals);
            factory.face = phantom.face = box.faces.get(1);
            extrude = new PossiblyBooleanExtrudeFactory(factory, phantom);
        });

        test('face direction positive is union', async () => {
            extrude.target = box;
            extrude.distance1 = 0.2;
            const result = await extrude.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.6));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1.2));
        });

        test('face direction negative is difference', async () => {
            extrude.target = box;
            extrude.distance1 = -0.2;
            const result = await extrude.commit() as visual.SpaceItem;

            const bbox = new THREE.Box3().setFromObject(result);
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.4));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 0, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0.8));
        });
    })
})

describe(ExtrudeSurfaceFactory, () => {
    let extrude: ExtrudeSurfaceFactory;
    beforeEach(() => {
        extrude = new ExtrudeSurfaceFactory(db, materials, signals);
    });

    test("it works", async () => {
        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        const curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        extrude.curve = curve;
        extrude.direction = new THREE.Vector3(0, 1, 0);

        const result = await extrude.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 2.5, 0.25));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 3, 0.5));
    })
})