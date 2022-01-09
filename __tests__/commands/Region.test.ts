import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let makeCircle1: CenterCircleFactory;
let makeCircle2: CenterCircleFactory;
let makeRegion1: RegionFactory;
let makeRegion2: RegionFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
    makeCircle1 = new CenterCircleFactory(db, materials, signals);
    makeCircle2 = new CenterCircleFactory(db, materials, signals);
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
