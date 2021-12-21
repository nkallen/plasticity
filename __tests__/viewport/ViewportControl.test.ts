/**
 * @jest-environment jsdom
 */
import { Viewport } from "../../src/components/viewport/Viewport";
import { MoveControlPointCommand, ViewportPointControl } from "../../src/components/viewport/ViewportPointControl";
import { Editor } from "../../src/editor/Editor";
import { MakeViewport } from "../../__mocks__/FakeViewport";
import * as visual from '../../src/visual_model/VisualModel';
import * as THREE from "three";
import { CenterCircleFactory } from "../../src/commands/circle/CircleFactory";
import '../matchers';
import { ViewportControl } from "../../src/components/viewport/ViewportControl";
import { Intersection } from "../../src/visual_model/Intersectable";

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