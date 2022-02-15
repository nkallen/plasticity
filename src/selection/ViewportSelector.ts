import * as THREE from "three";
import Command, * as cmd from "../command/Command";
import { Viewport } from "../components/viewport/Viewport";
import { defaultRaycasterParams, RaycasterParameters, ViewportControl } from "../components/viewport/ViewportControl";
import { DatabaseLike } from "../editor/DatabaseLike";
import { EditorSignals } from "../editor/EditorSignals";
import LayerManager from "../editor/LayerManager";
import * as intersectable from "../visual_model/Intersectable";
import { Boxcaster } from "./Boxcaster";
import { ChangeSelectionModifier, ChangeSelectionOption } from "./ChangeSelectionExecutor";
import { SelectionKeypressStrategy } from "./SelectionKeypressStrategy";

export interface EditorLike extends cmd.EditorLike {
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
    keymaps: AtomKeymap.KeymapManager;
}

export abstract class AbstractViewportSelector extends ViewportControl {
    private readonly selectionHelper = new BoxSelectionHelper(this.viewport.domElement, 'select-box');
    private readonly selectionBox = new Boxcaster(this.viewport.camera, this.layers.visible);

    constructor(
        viewport: Viewport,
        layers: LayerManager,
        db: DatabaseLike,
        protected readonly keypress: SelectionKeypressStrategy,
        signals: EditorSignals,
        raycasterParams: RaycasterParameters = defaultRaycasterParams(),
    ) {
        super(viewport, layers, db, signals, raycasterParams);
    }

    startHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent) {
        this.processHover(intersections, moveEvent);
    }

    continueHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent) {
        this.processHover(intersections, moveEvent);
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
        const selected = this.selectionBox.selectObjects(this.db.selectableObjects) as unknown as intersectable.Intersectable[];
        this.processBoxHover(new Set(selected), moveEvent);
    }

    startClick(intersections: intersectable.Intersection[], downEvent: MouseEvent) {
        return true;
    }

    endClick(intersections: intersectable.Intersection[], upEvent: MouseEvent) {
        this.processClick(intersections, upEvent);
    }

    endDrag(normalizedMousePosition: THREE.Vector2, upEvent: MouseEvent) {
        this.selectionHelper.onSelectOver();

        this.selectionBox.endPoint.set(normalizedMousePosition.x, normalizedMousePosition.y, 0.5);
        this.selectionBox.updateFrustum();
        const selected = this.selectionBox.selectObjects(this.db.selectableObjects) as unknown as intersectable.Intersectable[];
        this.processBoxSelect(new Set(selected), upEvent);
    }

    dblClick(intersections: intersectable.Intersection[], dblClickEvent: MouseEvent) {
        this.processDblClick(intersections, dblClickEvent)
    }

    protected abstract processBoxHover(selected: Set<intersectable.Intersectable>, moveEvent: MouseEvent): void;
    protected abstract processBoxSelect(selected: Set<intersectable.Intersectable>, upEvent: MouseEvent): void;

    protected abstract processClick(intersects: intersectable.Intersection[], upEvent: MouseEvent): void;
    protected abstract processHover(intersects: intersectable.Intersection[], moveEvent?: MouseEvent): void;
    protected abstract processDblClick(intersects: intersectable.Intersection[], dblClickEvent: MouseEvent): void;
}

export const mouseModifierKeys = ['ctrl', 'alt', 'shift', 'meta'];

export function command2modifier(command: string): ChangeSelectionModifier {
    switch (command) {
        case 'selection:replace':
            return ChangeSelectionModifier.Replace;
        case 'selection:add':
            return ChangeSelectionModifier.Add;
        case 'selection:remove':
            return ChangeSelectionModifier.Remove;
        default:
            throw new Error("invalid configuration");
    }
}

export function command2option(command: string) {
    switch (command) {
        case 'selection:option:ignore-mode':
            return ChangeSelectionOption.IgnoreMode;
        case 'selection:option:extend':
            return ChangeSelectionOption.Extend;
        default:
            throw new Error("invalid configuration");
    }
}

export class ViewportSelector extends AbstractViewportSelector {
    constructor(viewport: Viewport, private readonly editor: EditorLike,) {
        super(viewport, editor.layers, editor.db, new SelectionKeypressStrategy(editor.keymaps), editor.signals);
    }

    protected processBoxHover(selected: Set<intersectable.Intersectable>, moveEvent: MouseEvent) {
        this.editor.changeSelection.onBoxHover(selected, this.keypress.event2modifier(moveEvent));
    }

    protected processBoxSelect(selected: Set<intersectable.Intersectable>, upEvent: MouseEvent) {
        const command = new BoxChangeSelectionCommand(this.editor, selected, this.keypress.event2modifier(upEvent));
        this.editor.enqueue(command, true);
    }

    protected processClick(intersects: intersectable.Intersection[], upEvent: MouseEvent) {
        const command = new ClickChangeSelectionCommand(this.editor, intersects, this.keypress.event2modifier(upEvent), this.keypress.event2option(upEvent));
        this.editor.enqueue(command, true);
    }

    protected processDblClick(intersects: intersectable.Intersection[], upEvent: MouseEvent) {
        const command = new DblClickChangeSelectionCommand(this.editor, intersects, this.keypress.event2modifier(upEvent));
        this.editor.enqueue(command, true);
    }

    protected processHover(intersects: intersectable.Intersection[], event?: MouseEvent) {
        this.editor.changeSelection.onHover(intersects, this.keypress.event2modifier(event), this.keypress.event2option(event));
    }
}

class BoxSelectionHelper {
    private readonly element: HTMLElement;
    private readonly startPoint = new THREE.Vector2();
    private readonly pointTopLeft = new THREE.Vector2();
    private readonly pointBottomRight = new THREE.Vector2();

    constructor(private readonly domElement: HTMLElement, cssClassName: string) {
        this.element = document.createElement('div');
        this.element.classList.add('fixed', cssClassName);
        this.element.style.pointerEvents = 'none';
    }

    onSelectStart(event: PointerEvent) {
        this.domElement.appendChild(this.element);

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

export class ClickChangeSelectionCommand extends cmd.CommandLike {
    point?: THREE.Vector3;

    constructor(
        editor: cmd.EditorLike,
        private readonly intersection: intersectable.Intersection[],
        private readonly modifier: ChangeSelectionModifier,
        private readonly option: ChangeSelectionOption,
    ) { super(editor) }


    async execute(): Promise<void> {
        this.point = this.editor.changeSelection.onClick(this.intersection, this.modifier, this.option)?.point;
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class DblClickChangeSelectionCommand extends cmd.CommandLike {
    point?: THREE.Vector3;

    constructor(
        editor: cmd.EditorLike,
        private readonly intersection: intersectable.Intersection[],
        private readonly modifier: ChangeSelectionModifier
    ) { super(editor) }


    async execute(): Promise<void> {
        this.point = this.editor.changeSelection.onDblClick(this.intersection, this.modifier)?.point;
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}

export class BoxChangeSelectionCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly intersected: Set<intersectable.Intersectable>,
        private readonly modifier: ChangeSelectionModifier,
    ) { super(editor) }

    async execute(): Promise<void> {
        this.editor.changeSelection.onBoxSelect(this.intersected, this.modifier);
    }

    shouldAddToHistory(selectionChanged: boolean) {
        return selectionChanged;
    }
}
