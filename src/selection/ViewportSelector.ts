import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import Command, * as cmd from "../commands/Command";
import { BoxChangeSelectionCommand, ClickChangeSelectionCommand } from "../commands/CommandLike";
import { EditorSignals } from "../editor/EditorSignals";
import { DatabaseLike } from "../editor/GeometryDatabase";
import { EditorOriginator } from "../editor/History";
import * as SelectableLayers from "../editor/SelectableLayers";
import * as visual from "../editor/VisualModel";
import { BetterSelectionBox } from "../util/BetterRaycastingPoints";

export interface EditorLike extends cmd.EditorLike {
    originator: EditorOriginator,
    enqueue(command: Command, interrupt?: boolean): Promise<void>;
}

type State = { tag: 'none' } | { tag: 'down', downEvent: PointerEvent, disposable: Disposable } | { tag: 'dragging', downEvent: PointerEvent, startEvent: PointerEvent, disposable: Disposable }

export abstract class AbstractViewportSelector extends THREE.EventDispatcher {
    private _enabled = true;
    get enabled() { return this._enabled }
    set enabled(enabled: boolean) {
        this._enabled = enabled;
        if (!enabled) {
            switch (this.state.tag) {
                case 'none': break;
                case 'down':
                case 'dragging':
                    this.state.disposable.dispose();
            }
            this.state = { tag: 'none' };
        }
    }

    private state: State = { tag: 'none' }

    private readonly raycaster = new THREE.Raycaster();

    private readonly normalizedMousePosition = new THREE.Vector2(); // normalized device coordinates
    private readonly onDownPosition = new THREE.Vector2(); // screen coordinates
    private readonly currentPosition = new THREE.Vector2(); // screen coordinates

    private readonly selectionBox = new BetterSelectionBox(this.camera, this.db.scene);
    private readonly selectionHelper = new SelectionHelper(this.domElement, 'select-box');

    private readonly disposable = new CompositeDisposable();

    constructor(
        private readonly camera: THREE.Camera,
        private readonly domElement: HTMLElement,
        protected readonly db: DatabaseLike,
        protected readonly signals: EditorSignals
    ) {
        super();

        // @ts-expect-error("Line2 is missing from the typedef")
        this.raycaster.params.Line2 = { threshold: 15 };
        this.raycaster.params.Mesh.threshold = 0;
        // @ts-expect-error("Points is missing from the typedef")
        this.raycaster.params.Points.threshold = 10;
        this.raycaster.layers = visual.VisibleLayers;

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);

        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerMove);
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointerdown', this.onPointerDown)));
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointermove', this.onPointerMove)));
    }

    onPointerDown(downEvent: PointerEvent) {
        if (!this.enabled) return;
        if (downEvent.button !== 0) return;

        switch (this.state.tag) {
            case 'none':
                getMousePosition(this.domElement, downEvent.clientX, downEvent.clientY, this.onDownPosition);

                const disposable = new CompositeDisposable();

                document.addEventListener('pointerup', this.onPointerUp);
                document.addEventListener('pointermove', this.onPointerMove);
                disposable.add(new Disposable(() => document.removeEventListener('pointermove', this.onPointerMove)));
                disposable.add(new Disposable(() => document.removeEventListener('pointerup', this.onPointerUp)));

                this.state = { tag: 'down', disposable, downEvent }

                this.dispatchEvent({ type: 'start' });
                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    onPointerMove(moveEvent: PointerEvent) {
        if (!this.enabled) return;

        getMousePosition(this.domElement, moveEvent.clientX, moveEvent.clientY, this.currentPosition);

        switch (this.state.tag) {
            case 'none':
                const intersects = this.getIntersects(this.currentPosition, this.db.visibleObjects);
                this.processHover(SelectableLayers.filter(intersects));
                break;
            case 'down':
                const { downEvent, disposable } = this.state;
                const dragStartTime = downEvent.timeStamp;
                const currentPosition = new THREE.Vector2(moveEvent.clientX, moveEvent.clientY);
                const startPosition = new THREE.Vector2(downEvent.clientX, downEvent.clientY);

                if (moveEvent.timeStamp - dragStartTime >= consummationTimeThreshold ||
                    currentPosition.distanceTo(startPosition) >= consummationDistanceThreshold
                ) {
                    screen2normalized(this.onDownPosition, this.normalizedMousePosition);
                    this.selectionBox.startPoint.set(this.normalizedMousePosition.x, this.normalizedMousePosition.y, 0.5);
                    this.selectionHelper.onSelectStart(downEvent);

                    this.state = { tag: 'dragging', downEvent, disposable, startEvent: moveEvent }
                }

                break;
            case 'dragging':
                screen2normalized(this.currentPosition, this.normalizedMousePosition);
                this.selectionBox.endPoint.set(this.normalizedMousePosition.x, this.normalizedMousePosition.y, 0.5);
                this.selectionHelper.onSelectMove(moveEvent);

                const selected = this.selectionBox.select();
                this.processBoxHover(SelectableLayers.select(selected));

                break;
        }
    }

    onPointerUp(upEvent: PointerEvent) {
        if (!this.enabled) return;
        if (upEvent.button !== 0) return;

        getMousePosition(this.domElement, upEvent.clientX, upEvent.clientY, this.currentPosition);

        switch (this.state.tag) {
            case 'down':
                const intersects = this.getIntersects(this.currentPosition, [...this.db.visibleObjects]);
                this.processClick(SelectableLayers.filter(intersects));

                this.state.disposable.dispose();
                this.state = { tag: 'none' };
                this.dispatchEvent({ type: 'end' });

                break;
            case 'dragging':
                screen2normalized(this.currentPosition, this.normalizedMousePosition);
                this.selectionBox.endPoint.set(this.normalizedMousePosition.x, this.normalizedMousePosition.y, 0.5);
                this.selectionHelper.onSelectOver();

                const selected = this.selectionBox.select();
                this.processBoxSelect(SelectableLayers.select(selected));

                this.dispatchEvent({ type: 'end' });
                this.state.disposable.dispose();
                this.state = { tag: 'none' };

                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    protected abstract processBoxHover(selected: Set<SelectableLayers.Intersectable>): void;
    protected abstract processBoxSelect(selected: Set<SelectableLayers.Intersectable>): void;

    protected abstract processClick(intersects: SelectableLayers.Intersection[]): void;
    protected abstract processHover(intersects: SelectableLayers.Intersection[]): void;

    private getIntersects(screenPoint: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
        screen2normalized(screenPoint, this.normalizedMousePosition);
        this.raycaster.setFromCamera(this.normalizedMousePosition, this.camera);

        return this.raycaster.intersectObjects(objects, true);
    }

    dispose() { this.disposable.dispose() }
}

function screen2normalized(from: THREE.Vector2, to: THREE.Vector2) {
    to.set((from.x * 2) - 1, - (from.y * 2) + 1);
}

function getMousePosition(dom: HTMLElement, x: number, y: number, to: THREE.Vector2) {
    const rect = dom.getBoundingClientRect();
    to.set((x - rect.left) / rect.width, (y - rect.top) / rect.height);
}
export class ViewportSelector extends AbstractViewportSelector {
    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        private readonly editor: EditorLike,
    ) {
        super(camera, domElement, editor.db, editor.signals);
    }

    protected processBoxHover(selected: Set<SelectableLayers.Intersectable>) {
        this.editor.selectionInteraction.onBoxHover(selected);
    }

    protected processBoxSelect(selected: Set<SelectableLayers.Intersectable>) {
        const command = new BoxChangeSelectionCommand(this.editor, selected);
        this.editor.enqueue(command, true);
    }

    protected processClick(intersects: SelectableLayers.Intersection[]) {
        const command = new ClickChangeSelectionCommand(this.editor, intersects);
        this.editor.enqueue(command, true);
    }

    protected processHover(intersects: SelectableLayers.Intersection[]) {
        this.editor.selectionInteraction.onHover(intersects);
    }
}

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated

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