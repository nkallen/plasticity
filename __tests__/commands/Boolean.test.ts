import * as THREE from "three";
import { EditorLike } from "../../src/command/CommandKeyboardInput";
import { IntersectionFactory } from '../../src/commands/boolean/BooleanFactory';
import { BooleanKeyboardGizmo } from "../../src/commands/boolean/BooleanKeyboardGizmo";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { Cancel } from "../../src/util/Cancellable";
import * as visual from '../../src/visual_model/VisualModel';
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let intersect: IntersectionFactory;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    intersect = new IntersectionFactory(db, materials, signals);
})

describe(IntersectionFactory, () => {
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

            intersect.solid = sphere1;
            intersect.tools = [sphere2];
            const intersection = await intersect.commit();
            expect(intersection).toHaveCentroidNear(new THREE.Vector3(0, 0, 0));
        })
    })
})

describe(BooleanKeyboardGizmo, () => {
    let keyboard: BooleanKeyboardGizmo;
    let editor: EditorLike;
    let execute: jest.Mock<any>;
    let keybindingsRegistered: jest.Mock<any>;
    let keybindingsCleared: jest.Mock<any>;

    beforeEach(() => {
        editor = {
            viewports: [],
            signals: signals,
        } as unknown as EditorLike;
        keyboard = new BooleanKeyboardGizmo("whatever", editor);

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
            await expect(active).rejects.toBe(Cancel);
        });

        test("it cancels in toggle false state", async () => {
            keyboard.toggle(false);
            const active = keyboard.execute(execute);
            active.cancel();
            await expect(active).rejects.toBe(Cancel);
        });
    });
});
