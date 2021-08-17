import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import { EditorLike } from "../../src/commands/CommandKeyboardInput";
import ExtrudeFactory, { BooleanRegionExtrudeFactory, PossiblyBooleanRegionExtrudeFactory, RegionExtrudeFactory } from "../../src/commands/extrude/ExtrudeFactory";
import { ExtrudeKeyboardGizmo } from "../../src/commands/extrude/ExtrudeKeyboardGizmo";
import { RegionFactory } from "../../src/commands/region/RegionFactory";
import SphereFactory from "../../src/commands/sphere/SphereFactory";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/editor/VisualModel';
import { Cancel } from "../../src/util/Cancellable";
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

describe(ExtrudeKeyboardGizmo, () => {
    let keyboard: ExtrudeKeyboardGizmo;
    let editor: EditorLike;
    let execute: jest.Mock<any>;
    let keybindingsRegistered: jest.Mock<any>;
    let keybindingsCleared: jest.Mock<any>;

    beforeEach(() => {
        editor = {
            viewports: [],
            signals: signals,
        } as EditorLike;
        keyboard = new ExtrudeKeyboardGizmo(editor);

        execute = jest.fn();
        keybindingsRegistered = jest.fn();
        keybindingsCleared = jest.fn();

        signals.keybindingsRegistered.add(keybindingsRegistered);
        signals.keybindingsCleared.add(keybindingsCleared);
    });

    test('togglability', () => {
        const active = keyboard.execute(execute);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(0);
        expect(keybindingsCleared).toHaveBeenCalledTimes(0);

        keyboard.toggle(true);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(1);
        expect(keybindingsCleared).toHaveBeenCalledTimes(0);

        keyboard.toggle(true);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(1);
        expect(keybindingsCleared).toHaveBeenCalledTimes(0);

        keyboard.toggle(false);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(1);
        expect(keybindingsCleared).toHaveBeenCalledTimes(1);

        keyboard.toggle(true);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(2);
        expect(keybindingsCleared).toHaveBeenCalledTimes(1);

        active.finish();
        expect(keybindingsRegistered).toHaveBeenCalledTimes(2);
        expect(keybindingsCleared).toHaveBeenCalledTimes(2);
    });

    test('cancel', async () => {
        const active = keyboard.execute(execute);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(0);
        expect(keybindingsCleared).toHaveBeenCalledTimes(0);

        keyboard.toggle(true);
        expect(keybindingsRegistered).toHaveBeenCalledTimes(1);
        expect(keybindingsCleared).toHaveBeenCalledTimes(0);

        active.cancel();
        expect(keybindingsRegistered).toHaveBeenCalledTimes(1);
        expect(keybindingsCleared).toHaveBeenCalledTimes(1);

        await expect(active).rejects.toBe(Cancel);
    });
});