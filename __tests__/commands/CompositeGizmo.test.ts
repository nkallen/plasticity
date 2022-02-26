/**
 * @jest-environment jsdom
 */
import { Disposable } from "event-kit";
import * as THREE from "three";
import { AbstractGizmo, EditorLike, Intersector, Mode, MovementInfo } from "../../src/command/AbstractGizmo";
import { CompositeGizmo } from "../../src/command/CompositeGizmo";
import { GizmoMaterialDatabase } from "../../src/command/GizmoMaterials";
import { Viewport } from "../../src/components/viewport/Viewport";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { SelectionDatabase } from "../../src/selection/SelectionDatabase";
import { CancellablePromise } from "../../src/util/CancellablePromise";
import { Helpers } from "../../src/util/Helpers";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let gizmos: GizmoMaterialDatabase;
let signals: EditorSignals;
let helpers: Helpers;
let editor: Editor;
let viewport: Viewport;
let selection: SelectionDatabase;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);
    db = editor.db;
    selection = editor.selection;
    signals = editor.signals;
    helpers = editor.helpers;
})

class Params {
    angle = 0;
    distance = 0;
    length = 0;
}

class MyCompositeGizmo extends CompositeGizmo<Params> {
    readonly angle = new MockGizmo("my:angle", this.editor);
    readonly distance = new MockGizmo("my:distance", this.editor);
    readonly length = new MockGizmo("my:length", this.editor);

    execute(cb: (params: Params) => void, finishFast: Mode = Mode.Persistent): CancellablePromise<void> {
        const { angle, distance, length, params } = this;

        this.add(angle, distance, length);

        this.addGizmo(angle, angle => {
            params.angle = angle;
        });

        this.addGizmo(distance, distance => {
            params.distance = distance;
        });

        this.addGizmo(length, length => {
            params.length = length;
        });

        return super.execute(cb, finishFast);
    }
}

export class MockGizmo extends AbstractGizmo<(n: number) => void> {
    interrupt: jest.Mock<any, any>;
    hover: jest.Mock<any, any>;
    down: jest.Mock<any, any>;
    up_: jest.Mock<any, any>;
    move: jest.Mock<any, any>;

    constructor(name: string, editor: EditorLike) {
        super(name, editor);
        const handle = new THREE.Object3D();
        const picker = new THREE.Object3D();

        this.interrupt = jest.fn();
        this.hover = jest.fn();
        this.down = jest.fn();
        this.up_ = jest.fn();
        this.move = jest.fn();
    }

    onInterrupt(cb: (angle: number) => void) { this.interrupt() }
    onPointerDown(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) { this.down() }
    onPointerUp(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) { this.up_() }
    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) {
        this.move()
        cb(0);
    }
}

describe(CompositeGizmo, () => {
    let params: Params;
    let gizmo: MyCompositeGizmo;

    beforeEach(() => {
        params = new Params();
        gizmo = new MyCompositeGizmo(params, editor);
    })

    test("execute() adds and removes from helpers scene", async () => {
        expect(helpers.scene.children.length).toBe(0);
        const cancellable = gizmo.execute(params => { });
        expect(helpers.scene.children.length).toBe(1);
        cancellable.finish();
        await cancellable;
        expect(helpers.scene.children.length).toBe(0);
    })

    test("execute() changes values", async () => {
        let called = 0;
        const cancellable = gizmo.execute(params => called++);
        const stateMachine = gizmo.angle.stateMachine!;
        expect(called).toBe(0);

        stateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        stateMachine.command(() => { }, () => new Disposable(jest.fn()));
        expect(stateMachine.state.tag).toBe('command');
        expect(called).toBe(0);

        stateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        stateMachine.pointerMove();
        expect(called).toBe(1);

        stateMachine.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: 0}));
        stateMachine.pointerUp(() => { });

        cancellable.finish();
        await cancellable;

    });

    test("execute() is mutually exclusive", async () => {
        let called = 0;
        const cancellable = gizmo.execute(params => called++);
        const angleStateMachine = gizmo.angle.stateMachine!;
        const distanceStateMachine = gizmo.distance.stateMachine!;

        angleStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        angleStateMachine.command(() => { }, () => new Disposable(jest.fn()));
        angleStateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        angleStateMachine.pointerMove();

        expect(called).toBe(1);

        // Nothing happens for pointerDown/pointerMove events while the other state machine is active:
        distanceStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        distanceStateMachine.pointerDown(() => new Disposable(jest.fn()));
        distanceStateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        distanceStateMachine.pointerMove();

        expect(called).toBe(1);

        angleStateMachine.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: 0}));
        angleStateMachine.pointerUp(() => { });

        distanceStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        distanceStateMachine.command(() => { }, () => new Disposable(jest.fn()));
        distanceStateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        distanceStateMachine.pointerMove();

        expect(called).toBe(2);

        distanceStateMachine.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: 0}));
        distanceStateMachine.pointerUp(() => { });

        expect(called).toBe(2);

        cancellable.finish();
        await cancellable;
    });


    test("execute() mutex can be interrupted by a command", async () => {
        const execute = jest.fn();
        const cancellable = gizmo.execute(execute);
        const angleStateMachine = gizmo.angle.stateMachine!;
        const distanceStateMachine = gizmo.distance.stateMachine!;

        angleStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        const angleClearEvents = jest.fn();
        angleStateMachine.command(() => { }, () => new Disposable(angleClearEvents));
        angleStateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        angleStateMachine.pointerMove();

        expect(execute).toHaveBeenCalledTimes(1);

        // Nothing happens for pointerDown/pointerMove events while the other state machine is active:
        distanceStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        distanceStateMachine.pointerDown(() => new Disposable(jest.fn()));
        distanceStateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        distanceStateMachine.pointerMove();

        expect(execute).toHaveBeenCalledTimes(1);

        // But invoking a command will steal focus
        expect(gizmo.angle.interrupt).toHaveBeenCalledTimes(0);
        expect(angleClearEvents).toHaveBeenCalledTimes(0);
        distanceStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        const distanceClearEvents = jest.fn();
        distanceStateMachine.command(() => { }, () => new Disposable(distanceClearEvents));
        expect(gizmo.angle.interrupt).toHaveBeenCalledTimes(1);
        expect(angleClearEvents).toHaveBeenCalledTimes(1);

        distanceStateMachine.update(viewport, new MouseEvent('hover', { clientX: 50, clientY: 50}));
        distanceStateMachine.pointerMove();

        expect(execute).toHaveBeenCalledTimes(2);

        // And we can steal it back
        expect(gizmo.distance.interrupt).toHaveBeenCalledTimes(0);
        expect(distanceClearEvents).toHaveBeenCalledTimes(0);
        angleStateMachine.update(viewport, new MouseEvent('hover', { clientx: 50, clienty: 50}));
        angleStateMachine.command(() => { }, () => new Disposable(angleClearEvents));
        expect(gizmo.distance.interrupt).toHaveBeenCalledTimes(1);
        expect(distanceClearEvents).toHaveBeenCalledTimes(1);

        angleStateMachine.update(viewport, new MouseEvent('move', { clientx: 80, clienty: 20, button: -1}));
        angleStateMachine.pointerMove();

        expect(execute).toHaveBeenCalledTimes(3);

        angleStateMachine.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: 0}));
        angleStateMachine.pointerUp(() => { });

        cancellable.finish();
        await cancellable;
    })
})