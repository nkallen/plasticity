import * as THREE from "three";
import { AbstractGizmo, EditorLike, GizmoStateMachine, Intersector, mode, MovementInfo } from "../../src/commands/AbstractGizmo";
import { GizmoMaterialDatabase } from "../../src/commands/GizmoMaterials";
import { CompositeGizmo } from "../../src/commands/MiniGizmos";
import { Viewport } from "../../src/components/viewport/Viewport";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { GeometryDatabase } from '../../src/editor/GeometryDatabase';
import MaterialDatabase from '../../src/editor/MaterialDatabase';
import { Cancel, CancellablePromise } from "../../src/util/Cancellable";
import { Helpers } from "../../src/util/Helpers";
import { FakeMaterials } from "../../__mocks__/FakeMaterials";
import '../matchers';

let db: GeometryDatabase;
let materials: MaterialDatabase;
let gizmos: GizmoMaterialDatabase;
let signals: EditorSignals;
let helpers: Helpers;
let editor: EditorLike;
let viewport: Viewport;

beforeEach(() => {
    signals = new EditorSignals();
    materials = new FakeMaterials();
    gizmos = new GizmoMaterialDatabase(signals);
    db = new GeometryDatabase(materials, signals);
    helpers = new Helpers(signals);
    editor = {
        gizmos, helpers, signals, viewports: [],
    } as unknown as EditorLike;
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

    execute(cb: (params: Params) => void, finishFast: mode = mode.Persistent): CancellablePromise<void> {
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
    stateMachine!: GizmoStateMachine<(n: number) => void>;

    constructor(name: string, editor: EditorLike) {
        const handle = new THREE.Object3D();
        const picker = new THREE.Object3D();
        super(name, editor, { handle, picker });
    }

    execute(cb: (n: number) => void, finishFast: mode = mode.Transitory): CancellablePromise<void> {
        const stateMachine = new GizmoStateMachine(this as AbstractGizmo<(n: number) => void>, signals, cb);
        this.stateMachine = stateMachine;

        return new CancellablePromise<void>((resolve, reject) => {
            const cancel = () => { reject(Cancel) }
            const finish = () => { resolve() }
            return { cancel, finish };
        })
    }

    onPointerHover(intersect: Intersector): void { }
    onPointerDown(intersect: Intersector, info: MovementInfo) { }
    onPointerUp(intersect: Intersector, info: MovementInfo) { }
    onPointerMove(cb: (angle: number) => void, intersect: Intersector, info: MovementInfo) {
        cb(0);
    }
}

describe(CompositeGizmo, () => {
    let params: Params;
    let gizmo: MyCompositeGizmo;
    let viewport: Viewport;

    beforeEach(() => {
        params = new Params();
        viewport = { camera: new THREE.PerspectiveCamera() } as unknown as Viewport;
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
        const stateMachine = gizmo.angle.stateMachine;

        stateMachine.update(viewport, { x: 0, y: 0, button: 0 });
        stateMachine.command(() => { }, () => { });
        expect(stateMachine.state).toBe('command');

        stateMachine.update(viewport, { x: 0.6, y: 0.6, button: -1 });
        stateMachine.pointerMove();
        expect(called).toBe(1);

        stateMachine.update(viewport, { x: 0.6, y: 0.6, button: 0 });
        stateMachine.pointerUp(() => { });

        cancellable.finish();
        await cancellable;

    });

    test("execute() is mutually exclusive", async () => {
        let called = 0;
        const cancellable = gizmo.execute(params => called++);
        const angleStateMachine = gizmo.angle.stateMachine;
        const distanceStateMachine = gizmo.distance.stateMachine;

        angleStateMachine.update(viewport, { x: 0, y: 0, button: 0 });
        angleStateMachine.command(() => { }, () => { });
        angleStateMachine.update(viewport, { x: 0.6, y: 0.6, button: -1 });
        angleStateMachine.pointerMove();

        expect(called).toBe(1);

        distanceStateMachine.update(viewport, { x: 0, y: 0, button: 0 });
        distanceStateMachine.command(() => { }, () => { });
        distanceStateMachine.update(viewport, { x: 0.6, y: 0.6, button: -1 });
        distanceStateMachine.pointerMove();

        expect(called).toBe(1);

        angleStateMachine.update(viewport, { x: 0.6, y: 0.6, button: 0 });
        angleStateMachine.pointerUp(() => { });

        distanceStateMachine.update(viewport, { x: 0, y: 0, button: 0 });
        distanceStateMachine.command(() => { }, () => { });
        distanceStateMachine.update(viewport, { x: 0.6, y: 0.6, button: -1 });
        distanceStateMachine.pointerMove();

        expect(called).toBe(2);

        distanceStateMachine.update(viewport, { x: 0.6, y: 0.6, button: 0 });
        distanceStateMachine.pointerUp(() => { });

        cancellable.finish();
        await cancellable;
    })
})