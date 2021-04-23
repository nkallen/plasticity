/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import CommandRegistry from "../src/components/atom/CommandRegistry";
import { AbstractGizmo, GizmoStateMachine, Intersector, MovementInfo } from "../src/commands/AbstractGizmo";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import { Editor } from "../src/Editor";
import { Helpers } from "../src/util/Helpers";
import FakeSignals from '../__mocks__/FakeSignals';
import { FakeViewport } from "../__mocks__/FakeViewport";

class FakeGizmo extends AbstractGizmo<() => void> {
    fakeCommand: jest.Mock;

    constructor(editor: Editor) {
        const picker = new THREE.Group();
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.1));
        picker.add(p);
        const fakeCommand = jest.fn();
        p.userData.command = ['gizmo:fake:key', fakeCommand];
        const view = {
            handle: new THREE.Object3D(),
            picker: picker,
        };
        super("fake", editor, view);
        this.fakeCommand = fakeCommand;
    }

    onPointerMove(cb: () => void, intersector: Intersector, info: MovementInfo): void {
    }
    onPointerDown(intersect: Intersector): void { }
}

test("basic drag interaction", () => {
    const signals = FakeSignals();
    const viewport = new FakeViewport();
    viewport.camera.position.set(0, 0, 1);
    viewport.camera.lookAt(0, 0, 0);
    const editor = {
        viewports: [viewport],
        gizmos: new GizmoMaterialDatabase(signals)
    };
    const gizmo = new FakeGizmo(editor); // FIXME type error
    const cb = () => { };
    const sm = new GizmoStateMachine(gizmo, signals, cb);

    sm.update(viewport.camera, { x: 0, y: 0, button: 0 });
    sm.pointerHover();
    expect(sm.state).toBe('hover');

    sm.update(viewport.camera, { x: 0, y: 0, button: 0 });
    const onPointerDown = jest.spyOn(gizmo, 'onPointerDown');
    expect(onPointerDown).toHaveBeenCalledTimes(0);
    sm.pointerDown(() => {});
    expect(sm.state).toBe('dragging');
    expect(onPointerDown).toHaveBeenCalledTimes(1);

    sm.update(viewport.camera, { x: 0.6, y: 0.6, button: -1 });
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state).toBe('dragging');
    expect(onPointerMove).toHaveBeenCalledTimes(1);

    sm.update(viewport.camera, { x: 0.6, y: 0.6, button: 0 });
    sm.pointerUp(() => { });
    expect(sm.state).toBe('none');
});

test("commands are registered", done => {
    const signals = FakeSignals();
    const viewport = new FakeViewport();
    viewport.camera.position.set(0, 0, 1);
    viewport.camera.lookAt(0, 0, 0);
    const editor = {
        viewports: [viewport],
        gizmos: new GizmoMaterialDatabase(signals),
        helpers: new Helpers(signals),
        registry: new CommandRegistry(),
        signals: signals,
    };
    editor.registry.attach(viewport.renderer.domElement);
    const event = new CustomEvent("gizmo:fake:key");
    const gizmo = new FakeGizmo(editor); // FIXME type error
    expect(gizmo.fakeCommand).toHaveBeenCalledTimes(0);
    const result = gizmo.execute(() => {});
    result.then(() => {}, () => done());
    viewport.renderer.domElement.dispatchEvent(event);
    result.cancel();

    expect(gizmo.fakeCommand).toHaveBeenCalledTimes(1);
});

test("basic command interaction", () => {

})
