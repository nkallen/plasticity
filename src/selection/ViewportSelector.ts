import * as THREE from "three";
import Command, * as cmd from "../commands/Command";
import { BoxChangeSelectionCommand, ClickChangeSelectionCommand } from "../commands/CommandLike";
import { Viewport } from "../components/viewport/Viewport";
import { ViewportControl } from "../components/viewport/ViewportControl";
import * as intersectable from "../visual_model/Intersectable";
import { BetterSelectionBox } from "../util/BetterRaycastingPoints";

export interface EditorLike extends cmd.EditorLike {
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
}

export abstract class AbstractViewportSelector extends ViewportControl {
    private readonly selectionHelper = new SelectionHelper(this.viewport.domElement, 'select-box');
    private readonly selectionBox = new BetterSelectionBox(this.viewport.camera);

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
        this.selectionBox.endPoint.set(normalizedMousePosition.x, normalizedMousePosition.y, 0.5);
        this.selectionHelper.onSelectMove(moveEvent);

        const selected = this.selectionBox.select();
        this.processBoxHover(intersectable.filterMeshes(selected));
    }

    startClick(intersections: intersectable.Intersection[]) {
        return true;
    }

    endClick(intersections: intersectable.Intersection[]) {
        this.processClick(intersections);
    }

    protected endDrag(normalizedMousePosition: THREE.Vector2) {
        this.selectionBox.endPoint.set(normalizedMousePosition.x, normalizedMousePosition.y, 0.5);
        this.selectionHelper.onSelectOver();

        const selected = this.selectionBox.select();
        this.processBoxSelect(intersectable.filterMeshes(selected));
    }

    protected abstract processBoxHover(selected: Set<intersectable.Intersectable>): void;
    protected abstract processBoxSelect(selected: Set<intersectable.Intersectable>): void;

    protected abstract processClick(intersects: intersectable.Intersection[]): void;
    protected abstract processHover(intersects: intersectable.Intersection[]): void;
}

export class ViewportSelector extends AbstractViewportSelector {
    constructor(viewport: Viewport, private readonly editor: EditorLike,) {
        super(viewport, editor.layers, editor.db, editor.signals);
    }

    protected processBoxHover(selected: Set<intersectable.Intersectable>) {
        this.editor.selectionInteraction.onBoxHover(selected);
    }

    protected processBoxSelect(selected: Set<intersectable.Intersectable>) {
        const command = new BoxChangeSelectionCommand(this.editor, selected);
        this.editor.enqueue(command, true);
    }

    protected processClick(intersects: intersectable.Intersection[]) {
        const command = new ClickChangeSelectionCommand(this.editor, intersects);
        this.editor.enqueue(command, true);
    }

    protected processHover(intersects: intersectable.Intersection[]) {
        this.editor.selectionInteraction.onHover(intersects);
    }
}

class SelectionHelper {
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
    }

    onSelectOver() {
        this.element.parentElement!.removeChild(this.element);
    }
}