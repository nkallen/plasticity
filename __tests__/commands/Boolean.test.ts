import * as THREE from "three";
import { CutAndSplitFactory, CutFactory, IntersectionFactory, SplitFactory } from '../../src/commands/boolean/BooleanFactory';
import { BooleanKeyboardGizmo } from "../../src/commands/boolean/BooleanKeyboardGizmo";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { EditorLike } from "../../src/commands/CommandKeyboardInput";
import CurveFactory from "../../src/commands/curve/CurveFactory";
import SphereFactory from '../../src/commands/sphere/SphereFactory';
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import * as visual from '../../src/visual_model/VisualModel';
import { Cancel } from "../../src/util/Cancellable";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';
import c3d from '../../build/Release/c3d.node';
import { PlaneSnap } from "../../src/editor/snaps/Snap";

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

describe(CutFactory, () => {
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

    test('works with lines', async () => {
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

describe(SplitFactory, () => {
    test('cuts faces', async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        expect([...box.faces].length).toBe(6);

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const split = new SplitFactory(db, materials, signals);
        split.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        split.faces = [box.faces.get(0)];
        split.curve = line;
        const result = await split.commit() as visual.Solid;

        expect([...result.faces].length).toBe(7);
    });

})

describe(CutAndSplitFactory, () => {
    test('cuts faces', async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        const box = await makeBox.commit() as visual.Solid;
        expect([...box.faces].length).toBe(6);

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const split = new CutAndSplitFactory(db, materials, signals);
        split.constructionPlane = new PlaneSnap(new THREE.Vector3(0, 0, 1));
        split.faces = [box.faces.get(0)];
        split.curve = line;
        const results = await split.commit() as visual.Solid[];
        const result = results[0];

        expect([...result.faces].length).toBe(7);
    });

    test('works with lines', async () => {
        const makeSphere = new SphereFactory(db, materials, signals);
        makeSphere.center = new THREE.Vector3(0, 0, 0);
        makeSphere.radius = 1;
        const sphere = await makeSphere.commit() as visual.Solid;

        const makeLine = new CurveFactory(db, materials, signals);
        makeLine.points.push(new THREE.Vector3(-2, -2, 0));
        makeLine.points.push(new THREE.Vector3(2, 2, 0));
        const line = await makeLine.commit() as visual.SpaceInstance<visual.Curve3D>;

        const cut = new CutAndSplitFactory(db, materials, signals);
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
