import * as THREE from "three";
import { RadialArrayFactory, RectangularArrayFactory } from "../../src/commands/array/ArrayFactory";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
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

describe(RadialArrayFactory, () => {
    let array: RadialArrayFactory;
    beforeEach(() => {
        array = new RadialArrayFactory(db, materials, signals);
    })

    describe(visual.Solid, () => {
        let box: visual.Solid;

        beforeEach(async () => {
            const makeBox = new ThreePointBoxFactory(db, materials, signals);
            makeBox.p1 = new THREE.Vector3(0, 10, 0);
            makeBox.p2 = new THREE.Vector3(1, 10, 0);
            makeBox.p3 = new THREE.Vector3(1, 11, 0);
            makeBox.p4 = new THREE.Vector3(1, 11, 1);
            box = await makeBox.commit() as visual.Solid;
        })

        test('isPolar = true', async () => {
            array.solid = box;
            array.step1 = 10;
            array.dir1 = new THREE.Vector3(0, 1, 0);
            array.dir2 = new THREE.Vector3(0, 0, 1);
            array.num1 = 1;
            array.num2 = 12;
            array.degrees = 360;
            array.center = new THREE.Vector3();
            const items = await array.commit() as visual.Solid[];
            expect(items.length).toBe(12);
            const item = items[0];

            const bbox = new THREE.Box3();
            const center = new THREE.Vector3();
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 10.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 10, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 11, 1));
        });
    })

    describe(visual.Curve3D, () => {
        let circle: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3(0, 10, 0);
            makeCircle.radius = 1;
            circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        })

        test('isPolar = true', async () => {
            array.curve = circle;
            array.step1 = 10;
            array.dir1 = new THREE.Vector3(0, 1, 0);
            array.dir2 = new THREE.Vector3(0, 0, 1);
            array.num1 = 1;
            array.num2 = 12;
            array.degrees = 360;
            array.center = new THREE.Vector3();
            const item = await array.commit() as visual.Solid[];
            expect(item.length).toBe(12);
        })
    })
})

describe(RectangularArrayFactory, () => {
    let array: RectangularArrayFactory;
    beforeEach(() => {
        array = new RectangularArrayFactory(db, materials, signals);
    })

    describe(visual.Solid, () => {
        let box: visual.Solid;

        beforeEach(async () => {
            const makeBox = new ThreePointBoxFactory(db, materials, signals);
            makeBox.p1 = new THREE.Vector3(0, 10, 0);
            makeBox.p2 = new THREE.Vector3(1, 10, 0);
            makeBox.p3 = new THREE.Vector3(1, 11, 0);
            makeBox.p4 = new THREE.Vector3(1, 11, 1);
            box = await makeBox.commit() as visual.Solid;
        })

        test.only('isPolar = false', async () => {
            array.mode = 'spacing';
            array.solid = box;
            array.step1 = 10;
            array.dir1 = new THREE.Vector3(0, 1, 0);
            array.dir2 = new THREE.Vector3(0, 0, 1);
            array.num1 = 1;
            array.num2 = 12;
            array.step2 = 1;
            array.center = new THREE.Vector3();
            const items = await array.commit() as visual.Solid[];
            expect(items.length).toBe(12);
            const item = items[0];

            const bbox = new THREE.Box3();
            const center = new THREE.Vector3();
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 10.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 10, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 11, 1));

            bbox.setFromObject(items[items.length - 1]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 10.5, 11.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 10, 11));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 11, 12));
        });

        test.only('distance1 / distance2', async () => {
            array.mode = 'extent';
            array.solid = box;
            array.dir1 = new THREE.Vector3(1, 0, 0);
            array.dir2 = new THREE.Vector3(0, 1, 0);
            array.num1 = 10;
            array.distance1 = 10;
            array.center = new THREE.Vector3();
            const items = await array.commit() as visual.Solid[];
            expect(items.length).toBe(10);
            const item = items[0];

            const bbox = new THREE.Box3();
            const center = new THREE.Vector3();
            bbox.setFromObject(item);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 10.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0, 10, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 11, 1));

            bbox.setFromObject(items[items.length - 1]);
            bbox.getCenter(center);
            expect(center).toApproximatelyEqual(new THREE.Vector3(10.5, 10.5, 0.5));
            expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(10, 10, 0));
            expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(11, 11, 1));
        });
    })

    describe(visual.Curve3D, () => {
        let circle: visual.SpaceInstance<visual.Curve3D>;

        beforeEach(async () => {
            const makeCircle = new CenterCircleFactory(db, materials, signals);
            makeCircle.center = new THREE.Vector3(0, 10, 0);
            makeCircle.radius = 1;
            circle = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;
        })

        test('isPolar = true', async () => {
            array.curve = circle;
            array.step1 = 10;
            array.dir1 = new THREE.Vector3(0, 1, 0);
            array.dir2 = new THREE.Vector3(0, 0, 1);
            array.num1 = 1;
            array.num2 = 12;
            array.step2 = 1;
            array.center = new THREE.Vector3();
            const item = await array.commit() as visual.Solid[];
            expect(item.length).toBe(12);
        })
    })
})
