/**
 * @jest-environment jsdom
 */
import KeymapManager from "atom-keymap";
import * as THREE from "three";
import { EditorLike, MovementInfo } from "../../src/commands/AbstractGizmo";
import { MagnitudeGizmo } from "../../src/commands/fillet/FilletGizmo";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { AngleGizmo, DistanceGizmo, LengthGizmo } from "../../src/commands/MiniGizmos";
import { CircleMoveGizmo, MoveAxisGizmo, PlanarMoveGizmo } from "../../src/commands/translate/MoveGizmo";
import { CircleScaleGizmo, PlanarScaleGizmo, ScaleAxisGizmo } from "../../src/commands/translate/ScaleGizmo";
import CommandRegistry from "../../src/components/atom/CommandRegistry";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { Helpers } from "../../src/util/Helpers";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let gizmos: GizmoMaterialDatabase;
let signals: EditorSignals;
let helpers: Helpers;
let editor: EditorLike;

beforeEach(() => {
    signals = new EditorSignals();
    materials = new FakeMaterials();
    gizmos = new GizmoMaterialDatabase(signals);
    db = new GeometryDatabase(materials, signals);
    helpers = new Helpers(signals);
    const registry = new CommandRegistry();
    const keymaps = new KeymapManager();
    editor = {
        registry, db, gizmos, helpers, signals, viewports: [], keymaps
    } as unknown as EditorLike;
})

describe(AngleGizmo, () => {
    let gizmo: AngleGizmo;

    beforeEach(() => {
        gizmo = new AngleGizmo("name", editor);
        expect(gizmo.value).toBe(0);
    })

    test("it changes the angle, and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        const viewport = MakeViewport(editor);
        const info = { viewport } as MovementInfo;

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, info);
        gizmo.onPointerMove(cb, intersector, { angle: Math.PI / 2, viewport } as MovementInfo);
        expect(gizmo.value).toBe(Math.PI / 2);
        gizmo.onPointerUp(cb, intersector, info);
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, info);
        gizmo.onPointerMove(cb, intersector, { angle: Math.PI / 2, viewport } as MovementInfo);
        expect(gizmo.value).toBe(Math.PI);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(Math.PI / 2);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })

})

describe(CircleScaleGizmo, () => {
    let gizmo: CircleScaleGizmo;

    beforeEach(() => {
        gizmo = new CircleScaleGizmo("name", editor);
        expect(gizmo.value).toBe(1);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const center2d = new THREE.Vector2();
        const pointStart2d = new THREE.Vector2(0.1, 0.1);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBe(2);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBe(4);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(2);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })

})

describe(CircleMoveGizmo, () => {
    let gizmo: CircleMoveGizmo;

    beforeEach(() => {
        gizmo = new CircleMoveGizmo("name", editor);
        expect(gizmo.value).toEqual(new THREE.Vector3());
    })

    test("it changes vector delta and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const pointStart3d = new THREE.Vector3(0, 0, 0);
        const pointEnd3d = new THREE.Vector3(1, 1, 1);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart3d, pointEnd3d } as MovementInfo);
        expect(gizmo.value).toEqual(pointEnd3d.clone().sub(pointStart3d));
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart3d, pointEnd3d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart3d, pointEnd3d } as MovementInfo);
        expect(gizmo.value).toEqual(pointEnd3d.clone().sub(pointStart3d).multiplyScalar(2));

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toEqual(pointEnd3d.clone().sub(pointStart3d));
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(LengthGizmo, () => {
    let gizmo: LengthGizmo;

    beforeEach(() => {
        gizmo = new LengthGizmo("name", editor);
        expect(gizmo.value).toBe(0);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3() }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) }), {} as MovementInfo);
        expect(gizmo.value).toBe(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3() }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) }), {} as MovementInfo);
        expect(gizmo.value).toBe(2);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(DistanceGizmo, () => {
    let gizmo: DistanceGizmo;

    beforeEach(() => {
        gizmo = new DistanceGizmo("name", editor);
        expect(gizmo.value).toBe(0);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3() }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) }), {} as MovementInfo);
        expect(gizmo.value).toBe(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3() }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) }), {} as MovementInfo);
        expect(gizmo.value).toBe(2);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(MoveAxisGizmo, () => {
    let gizmo: MoveAxisGizmo;

    beforeEach(() => {
        gizmo = new MoveAxisGizmo("name", editor, gizmos.default);
        expect(gizmo.value).toBe(0);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3() }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) }), {} as MovementInfo);
        expect(gizmo.value).toBe(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3() }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: new THREE.Vector3(0, 1, 0) }), {} as MovementInfo);
        expect(gizmo.value).toBe(2);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(1);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(ScaleAxisGizmo, () => {
    let gizmo: ScaleAxisGizmo;

    beforeEach(() => {
        gizmo = new ScaleAxisGizmo("name", editor, gizmos.default);
        expect(gizmo.value).toBe(1);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const center2d = new THREE.Vector2();
        const pointStart2d = new THREE.Vector2(0.1, 0.1);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBe(2);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBe(4);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(2);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(PlanarMoveGizmo, () => {
    let gizmo: PlanarMoveGizmo;

    beforeEach(() => {
        gizmo = new PlanarMoveGizmo("name", editor, gizmos.default);
        expect(gizmo.value).toEqual(new THREE.Vector3());
    })

    test("it changes vector delta and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const pointStart = new THREE.Vector3();
        const pointEnd = new THREE.Vector3(1, 1, 0);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: pointStart }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: pointEnd }), {} as MovementInfo);
        expect(gizmo.value).toEqual(pointEnd.clone().sub(pointStart));
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: pointStart }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: pointEnd }), {} as MovementInfo);
        expect(gizmo.value).toEqual(pointEnd.clone().sub(pointStart).multiplyScalar(2));

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toEqual(pointEnd.clone().sub(pointStart));
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(PlanarScaleGizmo, () => {
    let gizmo: PlanarScaleGizmo;

    beforeEach(() => {
        gizmo = new PlanarScaleGizmo("name", editor, gizmos.default);
        expect(gizmo.value).toBe(1);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const pointStart = new THREE.Vector3();
        const pointEnd = new THREE.Vector3(1, 1, 0);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: pointStart }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: pointEnd }), {} as MovementInfo);
        expect(gizmo.value).toBe(Math.sqrt(2));
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector.mockReturnValueOnce({ point: pointStart }), {} as MovementInfo);
        gizmo.onPointerMove(cb, intersector.mockReturnValueOnce({ point: pointEnd }), {} as MovementInfo);
        expect(gizmo.value).toBeCloseTo(2);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBe(Math.sqrt(2));
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })
})

describe(MagnitudeGizmo, () => {
    let gizmo: MagnitudeGizmo;

    beforeEach(() => {
        gizmo = new MagnitudeGizmo("name", editor);
        expect(gizmo.value).toBe(0);
    })

    test("it changes size and respects interrupts", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const center2d = new THREE.Vector2();
        const pointStart2d = new THREE.Vector2(0.1, 0.1);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(0.14);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(0.28);

        gizmo.onInterrupt(intersector);
        expect(gizmo.value).toBeCloseTo(0.14);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);
    })

    test("it changes sign when it crosses its center", () => {
        const intersector = jest.fn();
        const cb = jest.fn();
        let info = {} as MovementInfo;

        const center2d = new THREE.Vector2();
        const pointStart2d = new THREE.Vector2(0.1, 0.1);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(0.2, 0.2) } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(0.14);
        gizmo.onPointerUp(cb, intersector, info)
        gizmo.onPointerLeave(intersector);

        gizmo.onPointerEnter(intersector);
        gizmo.onPointerDown(cb, intersector, { pointStart2d, center2d } as MovementInfo);
        gizmo.onPointerMove(cb, intersector, { pointStart2d, center2d, pointEnd2d: new THREE.Vector2(-0.1, -0.1) } as MovementInfo);
        expect(gizmo.value).toBeCloseTo(-0.14);
    })
})