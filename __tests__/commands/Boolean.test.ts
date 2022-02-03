import * as THREE from "three";
import { EditorLike } from "../../src/command/CommandKeyboardInput";
import { BooleanFactory, MultiBooleanFactory } from "../../src/commands/boolean/BooleanFactory";
import c3d from '../../build/Release/c3d.node';
import { PossiblyBooleanKeyboardGizmo } from "../../src/commands/boolean/BooleanKeyboardGizmo";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from "../../src/editor/MeshCreator";
import { Cancel } from "../../src/util/Cancellable";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
})

describe("Intersection", () => {
    let intersect: BooleanFactory;
    beforeEach(() => {
        intersect = new BooleanFactory(db, materials, signals);
        intersect.operationType = c3d.OperationType.Intersect;
    })

    describe('commit', () => {
        test('invokes the appropriate c3d commands', async () => {
            let makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(-0.5, -0.5, -0.5);
            makeSphere.radius = 1;
            const sphere1 = await makeSphere.commit() as visual.Solid;

            makeSphere = new SphereFactory(db, materials, signals);
            makeSphere.center = new THREE.Vector3(0.5, 0.5, 0.5);
            makeSphere.radius = 1;
            const sphere2 = await makeSphere.commit() as visual.Solid;

            intersect.target = sphere1;
            intersect.tools = [sphere2];
            const intersection = await intersect.commit();
            expect(intersection).toHaveCentroidNear(new THREE.Vector3(0, 0, 0));
        })
    })
})

describe(PossiblyBooleanKeyboardGizmo, () => {
    let keyboard: PossiblyBooleanKeyboardGizmo;
    let editor: EditorLike;
    let execute: jest.Mock<any>;
    let keybindingsRegistered: jest.Mock<any>;
    let keybindingsCleared: jest.Mock<any>;

    beforeEach(() => {
        editor = {
            viewports: [],
            signals: signals,
        } as unknown as EditorLike;
        keyboard = new PossiblyBooleanKeyboardGizmo("whatever", editor);

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

        await expect(active).rejects.toBeInstanceOf(Cancel);
    });


    describe("finish", () => {
        test("it finishes in toggle true state", async () => {
            keyboard.toggle(true);
            const active = keyboard.execute(execute);
            active.finish();
            await active;
        });

        test("it finishes in toggle false state", async () => {
            keyboard.toggle(false);
            const active = keyboard.execute(execute);
            active.finish();
            await active;
        });
    });

    describe("cancel", () => {
        test("it cancels in toggle true state", async () => {
            keyboard.toggle(true);
            const active = keyboard.execute(execute);
            active.cancel();
            await expect(active).rejects.toBeInstanceOf(Cancel);
        });

        test("it cancels in toggle false state", async () => {
            keyboard.toggle(false);
            const active = keyboard.execute(execute);
            active.cancel();
            await expect(active).rejects.toBeInstanceOf(Cancel);
        });
    });
});

describe(MultiBooleanFactory, () => {
    let difference: MultiBooleanFactory;
    beforeEach(() => {
        difference = new MultiBooleanFactory(db, materials, signals);
    })

    let box1: visual.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box1 = await makeBox.commit() as visual.Solid;
    })

    let box2: visual.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3(0.5, 0, 0);
        makeBox.p2 = new THREE.Vector3(1.5, 0, 0);
        makeBox.p3 = new THREE.Vector3(1.5, 1, 0);
        makeBox.p4 = new THREE.Vector3(1.5, 1, 1);
        box2 = await makeBox.commit() as visual.Solid;
    });

    let box3: visual.Solid;
    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(-1, 0, 0);
        makeBox.p3 = new THREE.Vector3(-1, 1, 0);
        makeBox.p4 = new THREE.Vector3(-1, 1, 1);
        box3 = await makeBox.commit() as visual.Solid;
    });


    test('a - (b + c)', async () => {
        difference.targets = [box1];
        difference.tools = [box2, box3];
        difference.move = new THREE.Vector3(0.25, 0, 0);

        const results = await difference.commit() as visual.Item[];
        expect(results.length).toBe(1);

        const bbox = new THREE.Box3().setFromObject(results[0]);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.5, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0.25, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(0.75, 1, 1));
    })

    test('a - c; b - c', async () => {
        difference.targets = [box1, box2];
        difference.tools = [box3];
        difference.move = new THREE.Vector3(0.25, 0, 0);

        const results = await difference.commit() as visual.Item[];
        expect(results.length).toBe(2);

        const bbox = new THREE.Box3().setFromObject(results[0]);
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(0.625, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0.25, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1, 1, 1));

        bbox.setFromObject(results[1]);
        bbox.getCenter(center);
        expect(center).toApproximatelyEqual(new THREE.Vector3(1, 0.5, 0.5));
        expect(bbox.min).toApproximatelyEqual(new THREE.Vector3(0.5, 0, 0));
        expect(bbox.max).toApproximatelyEqual(new THREE.Vector3(1.5, 1, 1));
    })

    test('ensure original position/etc does not change after commit/cancel', async () => {
        difference.targets = [box1];
        difference.tools = [box2, box3];
        difference.move = new THREE.Vector3(0.25, 0, 0);

        await difference.update();
        await difference.commit();

        expect(box1.position).toApproximatelyEqual(new THREE.Vector3())
        expect(box2.position).toApproximatelyEqual(new THREE.Vector3())
        expect(box3.position).toApproximatelyEqual(new THREE.Vector3())
    })
});