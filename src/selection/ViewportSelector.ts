import * as THREE from "three";
import Command, * as cmd from "../commands/Command";
import { BoxChangeSelectionCommand, ClickChangeSelectionCommand } from "../commands/CommandLike";
import { Viewport } from "../components/viewport/Viewport";
import { ViewportControl } from "../components/viewport/ViewportControl";
import * as intersectable from "../visual_model/Intersectable";
import { Boxcaster } from "./Boxcaster";
import { ChangeSelectionModifier } from "./ChangeSelectionExecutor";

export interface EditorLike extends cmd.EditorLike {
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
}

export abstract class AbstractViewportSelector extends ViewportControl {
    private readonly selectionHelper = new BoxSelectionHelper(this.viewport.renderer.domElement, 'select-box');
    private readonly selectionBox = new Boxcaster(this.viewport.camera, this.layers.visible);

    startHover(intersections: intersectable.Intersection[]) {
        this.processHover(intersections);
    }

    continueHover(intersections: intersectable.Intersection[]) {
        this.processHover(intersections);
    }

    endHover() { this.processHover([]) }

    startDrag(downEvent: PointerEvent, normalizedMousePosition: THREE.Vector2) {
        this.selectionBox.startPoint.set(normalizedMousePosition.x, normalizedMousePosition.y, 0.5);
        this.selectionHelper.onSelectStart(downEvent);
    }

    continueDrag(moveEvent: PointerEvent, normalizedMousePosition: THREE.Vector2) {
        this.selectionHelper.onSelectMove(moveEvent);

        this.selectionBox.endPoint.set(normalizedMousePosition.x, normalizedMousePosition.y, 0.5);
        this.selectionBox.updateFrustum();
        const selected = this.selectionBox.selectObjects(this.db.visibleObjects) as unknown as intersectable.Intersectable[];
        this.processBoxHover(new Set(selected));
    }

    startClick(intersections: intersectable.Intersection[], downEvent: MouseEvent) {
        return true;
    }

    endClick(intersections: intersectable.Intersection[], upEvent: MouseEvent) {
        this.processClick(intersections, upEvent);
    }

    endDrag(normalizedMousePosition: THREE.Vector2) {
        this.selectionHelper.onSelectOver();

        this.selectionBox.endPoint.set(normalizedMousePosition.x, normalizedMousePosition.y, 0.5);
        this.selectionBox.updateFrustum();
        const selected = this.selectionBox.selectObjects(this.db.visibleObjects) as unknown as intersectable.Intersectable[];
        this.processBoxSelect(new Set(selected));
    }

    protected abstract processBoxHover(selected: Set<intersectable.Intersectable>): void;
    protected abstract processBoxSelect(selected: Set<intersectable.Intersectable>): void;

    protected abstract processClick(intersects: intersectable.Intersection[], upEvent: MouseEvent): void;
    protected abstract processHover(intersects: intersectable.Intersection[]): void;
}

export class ViewportSelector extends AbstractViewportSelector {
    constructor(viewport: Viewport, private readonly editor: EditorLike,) {
        super(viewport, editor.layers, editor.db, editor.signals);
    }

    protected processBoxHover(selected: Set<intersectable.Intersectable>) {
        this.editor.changeSelection.onBoxHover(selected);
    }

    protected processBoxSelect(selected: Set<intersectable.Intersectable>) {
        const command = new BoxChangeSelectionCommand(this.editor, selected);
        this.editor.enqueue(command, true);
    }

    protected processClick(intersects: intersectable.Intersection[], upEvent: MouseEvent) {
        const command = new ClickChangeSelectionCommand(this.editor, intersects, ChangeSelectionModifier.Replace);
        this.editor.enqueue(command, true);
    }

    protected processHover(intersects: intersectable.Intersection[]) {
        this.editor.changeSelection.onHover(intersects);
    }
}

class BoxSelectionHelper {
    private readonly element: HTMLElement;
    private readonly startPoint = new THREE.Vector2();
    private readonly pointTopLeft = new THREE.Vector2();
    private readonly pointBottomRight = new THREE.Vector2();

    constructor(private readonly domElement: HTMLElement, cssClassName: string) {
        this.element = document.createElement('div');
        this.element.classList.add(cssClassName);
        this.element.style.pointerEvents = 'none';
    }

    onSelectStart(event: PointerEvent) {
        this.domElement.parentElement!.appendChild(this.element);

        this.element.style.left = event.clientX + 'px';
        this.element.style.top = event.clientY + 'px';
        this.element.style.width = '0px';
        this.element.style.height = '0px';

        this.startPoint.set(event.clientX, event.clientY);
    }

    onSelectMove(event: PointerEvent) {
        this.pointBottomRight.x = Math.max(this.startPoint.x, event.clientX);
        this.pointBottomRight.y = Math.max(this.startPoint.y, event.clientY);
        this.pointTopLeft.x = Math.min(this.startPoint.x, event.clientX);
        this.pointTopLeft.y = Math.min(this.startPoint.y, event.clientY);

        this.element.style.left = this.pointTopLeft.x + 'px';
        this.element.style.top = this.pointTopLeft.y + 'px';
        this.element.style.width = (this.pointBottomRight.x - this.pointTopLeft.x) + 'px';
        this.element.style.height = (this.pointBottomRight.y - this.pointTopLeft.y) + 'px';

        const classList = this.element.classList;
        if (this.startPoint.x > event.clientX) {
            classList.remove('contains');
            classList.add('intersects');
        } else {
            classList.remove('intersects');
            classList.add('contains');
        }
    }

    onSelectOver() {
        this.element.parentElement?.removeChild(this.element);
    }
}