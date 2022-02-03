/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import c3d from '../../build/Release/c3d.node';
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { MaxFilletFactory } from "../../src/commands/fillet/FilletFactory";
import { GizmoMaterialDatabase } from "../../src/command/GizmoMaterials";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import * as visual from '../../src/visual_model/VisualModel';
import { Cancel } from "../../src/util/Cancellable";
import { Helpers } from "../../src/util/Helpers";
import '../matchers';
import { CancellablePromise } from "../../src/util/CancellablePromise";
import { FilletMagnitudeGizmo, FilletSolidGizmo } from "../../src/commands/fillet/FilletGizmo";
import { ChamferAndFilletKeyboardGizmo } from "../../src/commands/fillet/FilletKeyboardGizmo";
import { Viewport } from "../../src/components/viewport/Viewport";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import { Intersector, MovementInfo } from "../../src/command/AbstractGizmo";

let db: GeometryDatabase;
let fillet: MaxFilletFactory;
let materials: MaterialDatabase;
let signals: EditorSignals;
let editor: Editor;
let gizmos: GizmoMaterialDatabase;
let helpers: Helpers;
let viewport: Viewport;

beforeEach(() => {
    editor = new Editor();
    materials = editor.materials;
    signals = editor.signals;
    db = editor._db;
    gizmos = editor.gizmos;
    helpers = editor.helpers;
    viewport = MakeViewport(editor);
})

beforeEach(() => {
    fillet = new MaxFilletFactory(db, materials, signals);
})

describe(FilletSolidGizmo, () => {
    let solid: visual.Solid;
    let edge: visual.CurveEdge;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(db, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        solid = await makeBox.commit() as visual.Solid;
        edge = solid.edges.get(0);

        fillet.solid = solid;
        fillet.edges = [edge];
    });

    let gizmo: FilletSolidGizmo;
    let promise: CancellablePromise<void>;

    beforeEach(() => {
        gizmo = new FilletSolidGizmo(fillet, editor, new THREE.Vector3());
        promise = gizmo.execute(async params => {
            gizmo.toggle(fillet.mode);
        });
        expect(fillet.distance).toBeCloseTo(0);
        expect(fillet.mode).toBe(c3d.CreatorType.FilletSolid);
    })

    test("pulling on the distance handle works", async () => {
        const handle = gizmo['main'];
        expect(handle.value).toBe(0);

        const sm = handle.stateMachine!;
        const cb = handle.stateMachine!['cb'];
        const intersector = { raycast: jest.fn(), snap: jest.fn() };

        handle.onPointerEnter(intersector);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3() })
        handle.onPointerDown(cb, intersector, {} as MovementInfo);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) })
        handle.onPointerMove(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        expect(handle.value).toBeCloseTo(1);
        handle.onPointerUp(cb, intersector, {} as MovementInfo)
        expect(handle.value).toBeCloseTo(1);

        expect(fillet.distance).toBeCloseTo(1);

        promise.finish();
        await promise;
    });

    test("setting to a negative value toggles", async () => {
        const handle = gizmo['main'];
        expect(handle.value).toBe(0);

        const sm = handle.stateMachine!;
        const cb = handle.stateMachine!['cb'];
        const intersector = { raycast: jest.fn(), snap: jest.fn() } ;

        handle.onPointerEnter(intersector);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3() })
        handle.onPointerDown(cb, intersector, {} as MovementInfo);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3(0, -1, 0) });
        handle.onPointerMove(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        expect(handle.value).toBeCloseTo(-1);
        handle.onPointerUp(cb, intersector, {} as MovementInfo)
        expect(handle.value).toBeCloseTo(-1);

        expect(fillet.distance).toBeCloseTo(-1);
        expect(fillet.mode).toBe(c3d.CreatorType.ChamferSolid);

        promise.finish();
        await promise;
    })
});


describe(ChamferAndFilletKeyboardGizmo, () => {
    let keyboard: ChamferAndFilletKeyboardGizmo;
    let promise: CancellablePromise<void>;

    beforeEach(() => {
        keyboard = new ChamferAndFilletKeyboardGizmo(editor);
        promise = keyboard.execute(async params => {
            keyboard.toggle(fillet.mode);
        });
    })

    describe("finish", () => {
        test("it finishes in chamfer state", async () => {
            keyboard.toggle(c3d.CreatorType.ChamferSolid);
            promise.finish();
            await promise;
        });

        test("it finishes in fillet state", async () => {
            keyboard.toggle(c3d.CreatorType.FilletSolid);
            promise.finish();
            await promise;
        });
    });

    describe("cancel", () => {
        test("it cancels in chamfer state", async () => {
            keyboard.toggle(c3d.CreatorType.ChamferSolid);
            promise.cancel();
            await expect(promise).rejects.toBeInstanceOf(Cancel);
        });

        test("it cancels in fillet state", async () => {
            keyboard.toggle(c3d.CreatorType.FilletSolid);
            promise.cancel();
            await expect(promise).rejects.toBeInstanceOf(Cancel);
        });
    });
});

const moveEvent = new MouseEvent('move');

describe(FilletMagnitudeGizmo, () => {
    let gizmo: FilletMagnitudeGizmo;

    beforeEach(() => {
        gizmo = new FilletMagnitudeGizmo("name", editor);
        expect(gizmo.value).toBe(0);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = { raycast: jest.fn(), snap: jest.fn() };
        const cb = jest.fn();
        let info = {} as MovementInfo;

        gizmo.onPointerEnter(intersector);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3() })
        gizmo.onPointerDown(cb, intersector, {} as MovementInfo);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) })
        gizmo.onPointerMove(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3() });
        gizmo.onPointerDown(cb, intersector, {} as MovementInfo);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) })
        gizmo.onPointerMove(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(2);

        gizmo.onInterrupt(() => {});
        expect(gizmo.value).toBeCloseTo(2);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })

    test("it changes sign when it crosses its center", () => {
        const intersector = { raycast: jest.fn(), snap: jest.fn() };
        const cb = jest.fn();
        let info = {} as MovementInfo;


        gizmo.onPointerEnter(intersector);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3() })
        gizmo.onPointerDown(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) });
        gizmo.onPointerMove(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3() });
        gizmo.onPointerDown(cb, intersector, {} as MovementInfo);
        intersector.raycast.mockReturnValueOnce({ point: new THREE.Vector3(0, -2, 0) });
        gizmo.onPointerMove(cb, intersector, { viewport, event: moveEvent  } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(-1);
    })
})