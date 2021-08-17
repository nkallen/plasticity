import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import ExtrudeFactory, { RegionExtrudeFactory } from "../../src/commands/extrude/ExtrudeFactory";
import { ExtrudeKeyboardGizmo } from "../../src/commands/extrude/ExtrudeKeyboardGizmo";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let makeCircle: CenterCircleFactory;
let makeRegion: RegionFactory;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    makeRegion = new RegionFactory(db, materials, signals);
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

describe(ExtrudeKeyboardGizmo, () => {

});