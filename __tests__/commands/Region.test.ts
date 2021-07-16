import * as THREE from "three";
import { CircleFactory } from "../../src/commands/circle/CircleFactory";
import { RegionBooleanFactory } from "../../src/commands/region/RegionBooleanFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import { EditorSignals } from '../../src/Editor';
import { GeometryDatabase } from '../../src/GeometryDatabase';
import MaterialDatabase from '../../src/MaterialDatabase';
import * as visual from '../../src/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import FakeSignals from '../../__mocks__/FakeSignals';
import '../matchers';

let db: GeometryDatabase;
let makeCircle1: CircleFactory;
let makeCircle2: CircleFactory;
let makeRegion1: RegionFactory;
let makeRegion2: RegionFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = FakeSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle1 = new CircleFactory(db, materials, signals);
    makeCircle2 = new CircleFactory(db, materials, signals);
    makeRegion1 = new RegionFactory(db, materials, signals);
    makeRegion2 = new RegionFactory(db, materials, signals);
})

describe('create regions', () => {
    test('invokes the appropriate c3d commands', async () => {
        makeCircle1.center = new THREE.Vector3();
        makeCircle1.radius = 1;
        const circle = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeRegion1.contours = [circle];
        const regions = await makeRegion1.commit() as visual.PlaneInstance<visual.Region>[];
        expect(regions.length).toBe(1);
        const region = regions[0];

        const bbox = new THREE.Box3().setFromObject(region);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-1, -1, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 0));
    })
})

describe('boolean regions', () => {
    let regionBoolean: RegionBooleanFactory;

    beforeEach(() => {
        regionBoolean = new RegionBooleanFactory(db, materials, signals);
    });

    test('invokes the appropriate c3d commands', async () => {
        makeCircle1.center = new THREE.Vector3(0.5, 0, 0);
        makeCircle1.radius = 1;
        const circle1 = await makeCircle1.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeCircle2.center = new THREE.Vector3(-0.5, 0, 0);
        makeCircle2.radius = 1;
        const circle2 = await makeCircle2.commit() as visual.SpaceInstance<visual.Curve3D>;

        makeRegion1.contours = [circle1];
        const regions1 = await makeRegion1.commit() as visual.PlaneInstance<visual.Region>[];
        expect(regions1.length).toBe(1);
        const region1 = regions1[0];

        makeRegion2.contours = [circle2];
        const regions2 = await makeRegion2.commit() as visual.PlaneInstance<visual.Region>[];
        expect(regions2.length).toBe(1);
        const region2 = regions2[0];

        regionBoolean.regions = [region1, region2];
        const boolean = await regionBoolean.commit() as visual.PlaneInstance<visual.Region>[];
        expect(boolean.length).toBe(1);
        const item = boolean[0];

        const bbox = new THREE.Box3().setFromObject(item);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3());
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(-0.5, -0.87, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.5, 0.87, 0));
    })
})