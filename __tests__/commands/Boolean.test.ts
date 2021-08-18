import * as THREE from "three";
import { CutFactory, IntersectionFactory } from '../../src/commands/boolean/BooleanFactory';
import { BooleanKeyboardGizmo } from "../../src/commands/boolean/BooleanKeyboardGizmo";
import { EditorLike } from "../../src/commands/CommandKeyboardInput";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { PlaneSnap } from "../../src/editor/SnapManager";
import * as visual from '../../src/editor/VisualModel';
import { Cancel } from "../../src/util/Cancellable";
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

describe('intersection', () => {
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

describe("cutting", () => {
    test('takes a cutting curve and a solid and produces a divided solid', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeCurve = new CurveFactory(db, materials, signals);
        makeCurve.points.push(new THREE.Vector3(-2, 2, 0));
        makeCurve.points.push(new THREE.Vector3(0, 2, 0.5));
        makeCurve.points.push(new THREE.Vector3(2, 2, 0));
        const curve = await makeCurve.commit() as visual.SpaceInstance<visual.Curve3D>;

        const cut = new CutFactory(db, materials, signals);
        cut.solid = sphere;
        cut.curve = curve;
        const result = await cut.commit() as visual.SpaceItem[];

        expect(result.length).toBe(2);
    });

    test.only('works with lines', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const cut = new CutFactory(db, materials, signals);
        cut.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        cut.solid = sphere;
        cut.curve = line;
        const result = await cut.commit() as visual.SpaceItem[];

        expect(result.length).toBe(2);
    });
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
        } as EditorLike;
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
});