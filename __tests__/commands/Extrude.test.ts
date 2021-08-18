import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import ExtrudeFactory, { BooleanRegionExtrudeFactory, PossiblyBooleanRegionExtrudeFactory, RegionExtrudeFactory } from "../../src/commands/extrude/ExtrudeFactory";
import { ExtrudeSurfaceFactory } from "../../src/commands/extrude/ExtrudeSurfaceFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
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

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
})

describe(ExtrudeFactory, () => {
    let extrude: ExtrudeFactory;
    beforeEach(() => {
        extrude = new ExtrudeFactory(db, materials, signals);
    });

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3();
            makeCircle.radius = 1;
            const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

            extrude.curves = [circle];
            extrude.direction = new THREE.Vector3(0, 0, 1);
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
})

describe(RegionExtrudeFactory, () => {
    let extrude: RegionExtrudeFactory;
    beforeEach(() => {
        extrude = new RegionExtrudeFactory(db, materials, signals);
    });

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            const makeRegion = new RegionFactory(db, materials, signals);

            makeCircle.center = new THREE.Vector3();
            makeCircle.radius = 1;
            const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
            makeRegion.contours = [circle];
            const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>;
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
})

describe(BooleanRegionExtrudeFactory, () => {
    let extrude: BooleanRegionExtrudeFactory;
    let region: visual.PlaneInstance<visual.Region>;
    let sphere: visual.Solid;

    beforeEach(() => {
        extrude = new BooleanRegionExtrudeFactory(db, materials, signals);
    });

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        const makeRegion = new RegionFactory(db, materials, signals);
        const makeSphere = new SphereFactory(db, materials, signals);

        makeCircle.center = new THREE.Vector3(0, 0, 2);
        makeCircle.radius = 0.1;
        const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeRegion.contours = [circle];
        const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>;
        region = items[0];

        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        sphere = await makeSphere.commit() as visual.Solid;
    });

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            extrude.region = region;
            extrude.solid = sphere;
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
        })
    })
})

describe(PossiblyBooleanRegionExtrudeFactory, () => {
    let extrude: PossiblyBooleanRegionExtrudeFactory;
    let region: visual.PlaneInstance<visual.Region>;
    let sphere: visual.Solid;

    beforeEach(() => {
        extrude = new PossiblyBooleanRegionExtrudeFactory(db, materials, signals);
    });

    beforeEach(async () => {
        const makeCircle = new CenterCircleFactory(db, materials, signals);
        const makeRegion = new RegionFactory(db, materials, signals);
        const makeSphere = new SphereFactory(db, materials, signals);

        makeCircle.center = new THREE.Vector3(0, 0, 2);
        makeCircle.radius = 0.1;
        const circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeRegion.contours = [circle];
        const items = await makeRegion.commit() as visual.PlaneInstance<visual.Region>;
        region = items[0];

        makeSphere.center = new THREE.Vector3();
        makeSphere.radius = 1;
        sphere = await makeSphere.commit() as visual.Solid;
    });

    describe('commit', () => {
        test('basic union', async () => {
            extrude.region = region;
            extrude.solid = sphere;
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
        })

        test('newBody=true', async () => {
            extrude.region = region;
            extrude.solid = sphere;
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
        })

        test('solid=undefined', async () => {
            extrude.region = region;
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
        })

        test('basic difference', async () => {
            extrude.region = region;
            extrude.solid = sphere;
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
        })
    })

    describe('phantom', () => {
        test('basic difference', async () => {
            extrude.region = region;
            extrude.solid = sphere;
            extrude.distance1 = 0;
            extrude.distance2 = 1.5;
            extrude.operationType = c3d.OperationType.Difference;
            await extrude.computeGeometry();
            // @ts-expect-error('testing protected field')
            const phantom = extrude.phantom;
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
        extrude.direction = new c3d.Vector3D(0, 1, 0);

        const result = await extrude.commit() as visual.SpaceItem;

        const bbox = new THREE.Box3().setFromObject(result);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0, 2.5, 0.25));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-2, 2, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(2, 3, 0.5));
    })
})