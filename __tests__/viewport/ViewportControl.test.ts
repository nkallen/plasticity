/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { Viewport } from "../../src/components/viewport/Viewport";
import { ViewportControl } from "../../src/components/viewport/ViewportControl";
import { Editor } from "../../src/editor/Editor";
import { Intersection } from "../../src/visual_model/Intersectable";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import '../matchers';

let editor: Editor;
let viewport: Viewport;

beforeEach(() => {
    editor = new Editor();
    viewport = MakeViewport(editor);
});

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