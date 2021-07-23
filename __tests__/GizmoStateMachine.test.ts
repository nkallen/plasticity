/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { AbstractGizmo, EditorLike, GizmoStateMachine, Intersector, MovementInfo } from "../src/commands/AbstractGizmo";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import CommandRegistry from "../src/components/atom/CommandRegistry";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { SelectionManager } from "../src/selection/SelectionManager";
import { Helpers } from "../src/util/Helpers";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import { FakeViewport } from "../__mocks__/FakeViewport";

class FakeGizmo extends AbstractGizmo<() => void> {
    fakeCommand: jest.Mock;

    constructor(editor: EditorLike) {
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

    onPointerMove(cb: () => void, intersector: Intersector, info: MovementInfo): void { }
    onPointerDown(intersect: Intersector): void { }
    onPointerUp(intersect: Intersector, info: MovementInfo): void {}
}

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let viewport: FakeViewport;
let editor: EditorLike;
let gizmo: FakeGizmo;
let selection: SelectionManager;
let gizmos: GizmoMaterialDatabase;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    selection = new SelectionManager(db, materials, signals);
    viewport = new FakeViewport();
    viewport.camera.position.set(0, 0, 1);
    viewport.camera.lookAt(0, 0, 0);
    editor = {
        viewports: [viewport],
        helpers: new Helpers(signals),
        registry: new CommandRegistry(),
        signals: signals,
        gizmos: gizmos,
    };
    gizmo = new FakeGizmo(editor); // FIXME type error
})

test("basic drag interaction", () => {
    const cb = () => { };
    const sm = new GizmoStateMachine(gizmo, signals, cb);

    sm.update(viewport, { x: 0, y: 0, button: 0 });
    sm.pointerHover();
    expect(sm.state).toBe('hover');

    sm.update(viewport, { x: 0, y: 0, button: 0 });
    const onPointerDown = jest.spyOn(gizmo, 'onPointerDown');
    expect(onPointerDown).toHaveBeenCalledTimes(0);
    sm.pointerDown(() => { });
    expect(sm.state).toBe('dragging');
    expect(onPointerDown).toHaveBeenCalledTimes(1);

    sm.update(viewport, { x: 0.6, y: 0.6, button: -1 });
    const onPointerMove = jest.spyOn(gizmo, 'onPointerMove');
    expect(onPointerMove).toHaveBeenCalledTimes(0);
    sm.pointerMove();
    expect(sm.state).toBe('dragging');
    expect(onPointerMove).toHaveBeenCalledTimes(1);

    sm.update(viewport, { x: 0.6, y: 0.6, button: 0 });
    sm.pointerUp(() => { });
    expect(sm.state).toBe('none');
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

test("basic command interaction", () => {

})
