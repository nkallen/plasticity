import * as THREE from "three";
import { AbstractGizmo, GizmoStateMachine, Intersector, MovementInfo } from "../src/commands/AbstractGizmo";
import { GizmoMaterialDatabase } from "../src/commands/GizmoMaterials";
import { MoveGizmo } from "../src/commands/move/MoveGizmo";
import { Editor } from "../src/Editor";
import FakeSignals from '../__mocks__/FakeSignals';
import { FakeViewport } from "../__mocks__/FakeViewport";

class FakeGizmo extends AbstractGizmo<() => void> {
    constructor(editor: Editor) {
        const view = {
            handle: new THREE.Object3D(),
            picker: new THREE.Mesh(new THREE.SphereGeometry(0.1)),
        };
        super(editor, view);
    }

    onPointerMove(cb: () => void, intersector: Intersector, info: MovementInfo): void {
    }
    onPointerDown(intersect: Intersector): void {
    }
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
    const gizmo = new FakeGizmo(editor);
    const cb = () => { };
    let sm = new GizmoStateMachine(gizmo, signals, cb);

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
})

test("basic command interaction", () => {

})
