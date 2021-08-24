/**
 * @jest-environment jsdom
 */
import { Disposable } from "event-kit";
import * as THREE from "three";
import { AbstractGizmo, GizmoStateMachine, Intersector, MovementInfo } from "../src/commands/AbstractGizmo";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import CommandRegistry from "../src/components/atom/CommandRegistry";
import { EditorLike, Viewport } from "../src/components/viewport/Viewport";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { SelectionManager } from "../src/selection/SelectionManager";
import { Helpers } from "../src/util/Helpers";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import { MakeViewport } from "../__mocks__/FakeViewport";

class FakeGizmo extends AbstractGizmo<() => void> {
    fakeCommand: jest.Mock;

    constructor(editor: EditorLike) {
        super("fake", editor);

        const p = new THREE.Mesh(new THREE.SphereGeometry(0.1));
        const fakeCommand = jest.fn();
        p.userData.command = ['gizmo:fake:key', fakeCommand];
        this.picker.add(p);
        this.handle.add(new THREE.Object3D());
        this.fakeCommand = fakeCommand;
    }

    onInterrupt(cb: () => void): void { }
    onPointerMove(cb: () => void, intersector: Intersector, info: MovementInfo): void { }
    onPointerDown(intersect: Intersector): void { }
    onPointerUp(intersect: Intersector, info: MovementInfo): void { }
}

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let viewport: Viewport;
let editor: EditorLike;
let gizmo: FakeGizmo;
let selection: SelectionManager;
let gizmos: GizmoMaterialDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
    editor = {
        viewports: [],
        helpers: new Helpers(signals),
        registry: new CommandRegistry(),
        signals, gizmos, db
    } as unknown as EditorLike;
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);
})

let start: number, end: number, interrupt: number;
let sm: GizmoStateMachine<() => void>;

beforeEach(() => {
    start = end = interrupt = 0;
    gizmo = new FakeGizmo(editor);
    const cb = () => { };
    sm = new GizmoStateMachine(gizmo, signals, cb);

    gizmo.addEventListener('start', () => start++);
    gizmo.addEventListener('end', () => end++);
    gizmo.addEventListener('interrupt', () => interrupt++);
});

test("basic drag interaction", () => {
    sm.update(viewport, { x: 0, y: 0, button: 0 });
    sm.pointerHover();
    expect(sm.state.tag).toBe('hover');
    expect(start).toBe(0);
    expect(end).toBe(0);

    sm.update(viewport, { x: 0, y: 0, button: 0 });
    const onPointerDown = jest.spyOn(gizmo, 'onPointerDown');
    expect(onPointerDown).toHaveBeenCalledTimes(0);
    const clearEventHandlers = jest.fn();
    sm.pointerDown(() => new Disposable(clearEventHandlers));
    expect(sm.state.tag).toBe('dragging');
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    sm.update(viewport, { x: 0.6, y: 0.6, button: -1 });
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state.tag).toBe('dragging');
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    expect(clearEventHandlers).toHaveBeenCalledTimes(0);
    sm.update(viewport, { x: 0.6, y: 0.6, button: 0 });
    sm.pointerUp(() => { });
    expect(clearEventHandlers).toHaveBeenCalledTimes(1);
    expect(sm.state.tag).toBe('none');
    expect(start).toBe(1);
    expect(end).toBe(1);
});

test("basic command interaction", () => {
    expect(sm.state.tag).toBe('none');
    expect(start).toBe(0);
    expect(end).toBe(0);

    sm.update(viewport, { x: 0, y: 0, button: 0 });
    const clearEventHandlers = jest.fn();
    sm.command(() => { }, () => new Disposable(clearEventHandlers));

    expect(sm.state.tag).toBe('command');
    expect(start).toBe(1);
    expect(end).toBe(0);

    sm.update(viewport, { x: 0.6, y: 0.6, button: -1 });
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state.tag).toBe('command');
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    expect(clearEventHandlers).toHaveBeenCalledTimes(0);
    sm.update(viewport, { x: 0.6, y: 0.6, button: 0 });
    sm.pointerUp(() => { });
    expect(clearEventHandlers).toHaveBeenCalledTimes(1);
    expect(sm.state.tag).toBe('none');
    expect(start).toBe(1);
    expect(end).toBe(1);
});

test("interrupt", () => {
    expect(sm.state.tag).toBe('none');
    expect(start).toBe(0);
    expect(end).toBe(0);

    sm.update(viewport, { x: 0, y: 0, button: 0 });
    const clearEventHandlers = jest.fn();
    sm.command(() => { }, () => new Disposable(clearEventHandlers));

    expect(sm.state.tag).toBe('command');
    expect(start).toBe(1);
    expect(end).toBe(0);

    sm.update(viewport, { x: 0.6, y: 0.6, button: -1 });
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state.tag).toBe('command');
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    const onInterrupt = jest.spyOn(gizmo, 'onInterrupt');
    expect(clearEventHandlers).toHaveBeenCalledTimes(0);
    expect(onInterrupt).toHaveBeenCalledTimes(0);
    sm.interrupt();
    expect(onInterrupt).toHaveBeenCalledTimes(1);
    expect(clearEventHandlers).toHaveBeenCalledTimes(1);
    expect(sm.state.tag).toBe('none');
    expect(start).toBe(1);
    expect(end).toBe(0);
    expect(interrupt).toBe(1);
});


test("commands are registered", done => {
    editor.registry.attach(viewport.renderer.domElement);
    const event = new CustomEvent("gizmo:fake:key");
    expect(gizmo.fakeCommand).toHaveBeenCalledTimes(0);
    const result = gizmo.execute(() => { });
    result.then(() => { }, () => done());
    viewport.renderer.domElement.dispatchEvent(event);
    result.cancel();

    expect(gizmo.fakeCommand).toHaveBeenCalledTimes(1);
});
