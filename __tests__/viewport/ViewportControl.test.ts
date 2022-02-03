/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { ThreePointBoxFactory } from "../../src/commands/box/BoxFactory";
import { Viewport } from "../../src/components/viewport/Viewport";
import { ViewportControl } from "../../src/components/viewport/ViewportControl";
import { Editor } from "../../src/editor/Editor";
import { EditorSignals } from "../../src/editor/EditorSignals";
import { GeometryDatabase } from "../../src/editor/GeometryDatabase";
import MaterialDatabase from "../../src/editor/MaterialDatabase";
import { Intersection } from "../../src/visual_model/Intersectable";
import * as visual from '../../src/visual_model/VisualModel';
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let editor: Editor;
let viewport: Viewport;
let db: GeometryDatabase;
let materials: MaterialDatabase;
let signals: EditorSignals;
let camera: THREE.Camera;

beforeEach(() => {
    editor = new Editor();
    db = editor._db;
    materials = editor.materials;
    signals = editor.signals;
    viewport = MakeViewport(editor);
    camera = viewport.camera;
});

let solid: visual.Solid;

beforeEach(async () => {
    expect(db.temporaryObjects.children.length).toBe(0);
    const makeBox = new ThreePointBoxFactory(db, materials, signals);
    makeBox.p1 = new THREE.Vector3();
    makeBox.p2 = new THREE.Vector3(1, 0, 0);
    makeBox.p3 = new THREE.Vector3(1, 1, 0);
    makeBox.p4 = new THREE.Vector3(1, 1, 1);
    solid = await makeBox.commit() as visual.Solid;
    solid.updateMatrixWorld();
});

beforeEach(() => {
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);

    solid.lod.update(camera);
})

afterEach(() => {
    viewport.dispose();
})

class MyViewportControl extends ViewportControl {
    startHover(intersections: Intersection[], moveEvent: MouseEvent): void {
        throw new Error("Method not implemented.");
    }
    continueHover(intersections: Intersection[], moveEvent: MouseEvent): void {
        throw new Error("Method not implemented.");
    }
    endHover(): void {
        throw new Error("Method not implemented.");
    }
    startClick(intersections: Intersection[], downEvent: MouseEvent): boolean {
        throw new Error("Method not implemented.");
    }
    endClick(intersections: Intersection[], upEvent: MouseEvent): void {
        throw new Error("Method not implemented.");
    }
    startDrag(downEvent: MouseEvent, normalizedMousePosition: THREE.Vector2): void {
        throw new Error("Method not implemented.");
    }
    continueDrag(moveEvent: MouseEvent, normalizedMousePosition: THREE.Vector2): void {
        throw new Error("Method not implemented.");
    }
    endDrag(normalizedMousePosition: THREE.Vector2, upEvent: MouseEvent): void {
        throw new Error("Method not implemented.");
    }
    dblClick(intersections: Intersection[], upEvent: MouseEvent): void {
        throw new Error("Method not implemented.");
    }
}

let control: MyViewportControl;
beforeEach(() => {
    control = new MyViewportControl(viewport, editor.layers, editor.db, editor.signals);
})

test('enable & reenable without race', () => {
    expect(control.enabled).toBe(true);
    const reenable = control.enable(false);
    expect(control.enabled).toBe(false);
    reenable.dispose();
    expect(control.enabled).toBe(true);
})

test('enable & reenable with race', () => {
    expect(control.enabled).toBe(true);
    const reenable = control.enable(false);
    expect(control.enabled).toBe(false);
    control.enable(false);
    reenable.dispose();
    expect(control.enabled).toBe(false);
})

test('click', () => {
    const startClick = jest.spyOn(control, 'startClick').mockImplementation(() => true);
    control.onPointerDown(new MouseEvent('pointerdown'));
    expect(startClick).toBeCalledTimes(1);

    const endClick = jest.spyOn(control, 'endClick').mockImplementation(() => { });
    control.onPointerUp(new MouseEvent('pointerup'));
    expect(endClick).toBeCalledTimes(1);
});

test('dblclick', () => {
    const startClick = jest.spyOn(control, 'startClick').mockImplementation(() => true);
    control.onPointerDown(new MouseEvent('pointerdown'));
    expect(startClick).toBeCalledTimes(1);

    const endClick = jest.spyOn(control, 'endClick').mockImplementation(() => { });
    control.onPointerUp(new MouseEvent('pointerup'));
    expect(endClick).toBeCalledTimes(1);

    control.onPointerDown(new MouseEvent('pointerdown'));
    expect(startClick).toBeCalledTimes(2);

    const dblClick = jest.spyOn(control, 'dblClick').mockImplementation(() => { });
    control.onPointerUp(new MouseEvent('pointerup'));
    expect(startClick).toBeCalledTimes(2);
    expect(endClick).toBeCalledTimes(1);
    expect(dblClick).toBeCalledTimes(1);
})

test('dblclick when mouse moves dramatically', () => {
    const startClick = jest.spyOn(control, 'startClick').mockImplementation(() => true);
    control.onPointerDown(new MouseEvent('pointerdown'));
    expect(startClick).toBeCalledTimes(1);

    const endClick = jest.spyOn(control, 'endClick').mockImplementation(() => { });
    control.onPointerUp(new MouseEvent('pointerup', { clientX: 0, clientY: 0 }));
    expect(endClick).toBeCalledTimes(1);

    control.onPointerDown(new MouseEvent('pointerdown'));
    expect(startClick).toBeCalledTimes(2);

    const dblClick = jest.spyOn(control, 'dblClick').mockImplementation(() => { });
    control.onPointerUp(new MouseEvent('pointerup', { clientX: 100, clientY: 100 }));
    expect(startClick).toBeCalledTimes(2);
    expect(endClick).toBeCalledTimes(1);
    expect(dblClick).toBeCalledTimes(0);
})

test('wheel', () => {
    const startClick = jest.spyOn(control, 'startClick').mockImplementation(() => true);
    control.onPointerDown(new MouseEvent('pointerdown', { button: 0, clientX: 50, clientY: 50 }));
    expect(startClick).toBeCalledTimes(1);

    const startHover = jest.spyOn(control, 'startHover').mockImplementation(() => true);
    control.onWheel(new WheelEvent('wheel', { deltaY: 10 }));
    expect(startHover).toBeCalledTimes(1);

    const continueHover = jest.spyOn(control, 'continueHover').mockImplementation(() => true);
    control.onWheel(new WheelEvent('wheel', { deltaY: 10 }));
    expect(continueHover).toBeCalledTimes(1);

    const endClick = jest.spyOn(control, 'endClick').mockImplementation(() => { });
    control.onPointerUp(new MouseEvent('pointerup'));
    expect(endClick).toBeCalledTimes(1);
})