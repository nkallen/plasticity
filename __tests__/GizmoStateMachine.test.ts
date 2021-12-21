/**
 * @jest-environment jsdom
 */
import { Disposable } from "event-kit";
import * as THREE from "three";
import { AbstractGizmo, GizmoStateMachine, Intersector, MovementInfo } from "../src/command/AbstractGizmo";
import { EditorLike, Viewport } from "../src/components/viewport/Viewport";
import { Editor } from "../src/editor/Editor";
import { EditorSignals } from '../src/editor/EditorSignals';
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
    onPointerDown(cb: () => void, intersect: Intersector): void { }
    onPointerUp(cb: () => void, intersect: Intersector, info: MovementInfo): void { }
}

let signals: EditorSignals;
let viewport: Viewport;
let editor: Editor;
let gizmo: FakeGizmo;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
    editor.viewports.push(viewport);
    signals = editor.signals;
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
    sm.update(viewport, new MouseEvent('hover', { clientX: 50, clientY: 50}));
    sm.pointerHover();
    expect(sm.state.tag).toBe('hover');
    expect(start).toBe(0);
    expect(end).toBe(0);

    sm.update(viewport, new MouseEvent('down', { clientX: 50, clientY: 50}));
    const onPointerDown = jest.spyOn(gizmo, 'onPointerDown');
    expect(onPointerDown).toHaveBeenCalledTimes(0);
    const clearEventHandlers = jest.fn();
    sm.pointerDown(() => new Disposable(clearEventHandlers));
    expect(sm.state.tag).toBe('dragging');
    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    sm.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: -1}));
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state.tag).toBe('dragging');
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    expect(clearEventHandlers).toHaveBeenCalledTimes(0);
    sm.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: 0}));
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

    sm.update(viewport, new MouseEvent('hover', { clientX: 50, clientY: 50}));
    const clearEventHandlers = jest.fn();
    sm.command(() => { }, () => new Disposable(clearEventHandlers));

    expect(sm.state.tag).toBe('command');
    expect(start).toBe(1);
    expect(end).toBe(0);

    sm.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: -1}));
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state.tag).toBe('command');
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(start).toBe(1);
    expect(end).toBe(0);

    expect(clearEventHandlers).toHaveBeenCalledTimes(0);
    sm.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: 0}));
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

    sm.update(viewport, new MouseEvent('hover', { clientX: 50, clientY: 50}));
    const clearEventHandlers = jest.fn();
    sm.command(() => { }, () => new Disposable(clearEventHandlers));

    expect(sm.state.tag).toBe('command');
    expect(start).toBe(1);
    expect(end).toBe(0);

    sm.update(viewport, new MouseEvent('move', { clientX: 80, clientY: 20, button: -1}));
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

test("isActive", () => {
    const onActivate = jest.spyOn(gizmo, 'onActivate');
    expect(onActivate).toHaveBeenCalledTimes(0);

    const onDeactivate = jest.spyOn(gizmo, 'onDeactivate');
    expect(onDeactivate).toHaveBeenCalledTimes(0);

    sm.isActive = false;
    expect(onActivate).toHaveBeenCalledTimes(0);
    expect(onDeactivate).toHaveBeenCalledTimes(1);

    sm.isActive = true;
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onDeactivate).toHaveBeenCalledTimes(1);
})
