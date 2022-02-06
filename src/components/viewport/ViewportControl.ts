import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { DatabaseLike } from "../../editor/DatabaseLike";
import { EditorSignals } from "../../editor/EditorSignals";
import LayerManager from "../../editor/LayerManager";
import { SelectionMode } from "../../selection/ChangeSelectionExecutor";
import { SelectionModeSet } from "../../selection/SelectionDatabase";
import { GeometryPicker } from "../../visual_model/GeometryPicker";
import * as intersectable from "../../visual_model/Intersectable";
import { Viewport } from "./Viewport";

type State = { tag: 'none', previousEvent?: MouseEvent } | { tag: 'hover', previousEvent?: MouseEvent } | { tag: 'down', downEvent: MouseEvent, disposable: Disposable, previousEvent?: MouseEvent } | { tag: 'dragging', downEvent: MouseEvent, startEvent: MouseEvent, disposable: Disposable } | { tag: 'wheel', intersections: intersectable.Intersection[], index: number, disposable: Disposable }

export type RaycasterParameters = THREE.RaycasterParameters & { Line2: { threshold: number } };

export function defaultRaycasterParams(): RaycasterParameters {
    return {
        Mesh: { threshold: 0 },
        Line: { threshold: 0.1 },
        Line2: { threshold: 15 },
        Points: { threshold: 20 }
    }
};

export abstract class ViewportControl extends THREE.EventDispatcher {
    protected readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    // TODO: use AtomicRef<boolean>
    private clock = 0;
    private _enabled = true;
    get enabled() { return this._enabled }
    enable(enabled: boolean) {
        const clock = ++this.clock;

        const before = this._enabled;
        this._enabled = enabled;
        if (!enabled) {
            switch (this.state.tag) {
                case 'none': break;
                case 'hover':
                    this.endHover();
                    break;
                case 'down':
                case 'dragging':
                    this.state.disposable.dispose();
            }
            this.state = { tag: 'none' };
        }
        return new Disposable(() => {
            if (clock < this.clock) return;
            this.enable(before);
        });
    }
    private state: State = { tag: 'none' }
    private readonly picker = new GeometryPicker(this.layers, this.raycasterParams);

    private readonly normalizedMousePosition = new THREE.Vector2(); // normalized device coordinates
    private readonly onDownPosition = new THREE.Vector2(); // normalized device coordinates

    constructor(
        protected readonly viewport: Viewport,
        protected readonly layers: LayerManager,
        protected readonly db: DatabaseLike,
        private readonly signals: EditorSignals,
        readonly raycasterParams: RaycasterParameters = defaultRaycasterParams(),
    ) {
        super();

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
        this.selectionModeChanged = this.selectionModeChanged.bind(this);
    }

    addEventLiseners() {
        const domElement = this.viewport.renderer.domElement;
        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerMove);
        domElement.addEventListener('wheel', this.onWheel);
        this.disposable.add(new Disposable(() => {
            domElement.removeEventListener('pointerdown', this.onPointerDown);
            domElement.removeEventListener('pointermove', this.onPointerMove);
            domElement.removeEventListener('wheel', this.onWheel);
        }));

        this.signals.selectionModeChanged.add(this.selectionModeChanged);
        this.disposable.add(new Disposable(() => {
            this.signals.selectionModeChanged.remove(this.selectionModeChanged);
        }));
    }

    onPointerDown(downEvent: MouseEvent) {
        if (!this.enabled) return;
        if (downEvent.button !== 0) return;
        if (downEvent.altKey) return;

        switch (this.state.tag) {
            case 'hover':
                this.endHover();
            case 'none':
                this.viewport.getNormalizedMousePosition(downEvent, this.onDownPosition);
                this.normalizedMousePosition.copy(this.onDownPosition);

                const intersects = this.getIntersects(this.normalizedMousePosition, this.db.selectableObjects);
                if (!this.startClick(intersects, downEvent)) return;

                const disposable = new CompositeDisposable();

                document.addEventListener('pointerup', this.onPointerUp);
                document.addEventListener('pointermove', this.onPointerMove);
                disposable.add(new Disposable(() => document.removeEventListener('pointermove', this.onPointerMove)));
                disposable.add(new Disposable(() => document.removeEventListener('pointerup', this.onPointerUp)));
                disposable.add(new Disposable(() => this.dispatchEvent({ type: 'end' })));

                downEvent.preventDefault();
                downEvent.stopPropagation();
                downEvent.stopImmediatePropagation();

                this.state = { tag: 'down', disposable, downEvent, previousEvent: this.state.previousEvent };

                this.dispatchEvent({ type: 'start' });
                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    onPointerMove(moveEvent: MouseEvent) {
        if (!this.enabled) return;
        this.viewport.getNormalizedMousePosition(moveEvent, this.normalizedMousePosition);

        switch (this.state.tag) {
            case 'none': {
                const intersects = this.getIntersects(this.normalizedMousePosition, this.db.selectableObjects);
                if (intersects.length === 0) break;
                this.startHover(intersects, moveEvent);
                this.state = { tag: 'hover', previousEvent: this.state.previousEvent };
                break;
            }
            case 'hover': {
                const intersects = this.getIntersects(this.normalizedMousePosition, this.db.selectableObjects);
                if (intersects.length === 0) {
                    this.endHover();
                    this.state = { tag: 'none' };
                } else this.continueHover(intersects, moveEvent);
                break;
            }
            case 'down': {
                const { downEvent, disposable } = this.state;
                const dragStartTime = downEvent.timeStamp;
                const currentPosition = new THREE.Vector2(moveEvent.clientX, moveEvent.clientY);
                const startPosition = new THREE.Vector2(downEvent.clientX, downEvent.clientY);

                if (moveEvent.timeStamp - dragStartTime >= dragConsummationTimeThreshold ||
                    currentPosition.distanceTo(startPosition) >= consummationDistanceThreshold
                ) {
                    this.normalizedMousePosition.copy(this.onDownPosition);
                    this.startDrag(downEvent, this.normalizedMousePosition);

                    this.state = { tag: 'dragging', downEvent, disposable, startEvent: moveEvent }
                }
                break;
            }
            case 'dragging':
                this.continueDrag(moveEvent, this.normalizedMousePosition);
                break;
        }
    }

    onPointerUp(upEvent: MouseEvent) {
        if (!this.enabled) return;
        if (upEvent.button !== 0) return;
        this.viewport.getNormalizedMousePosition(upEvent, this.normalizedMousePosition);

        switch (this.state.tag) {
            case 'down':
                const { previousEvent } = this.state;

                const intersects = this.getIntersects(this.normalizedMousePosition, [...this.db.selectableObjects]);
                const currentTime = upEvent.timeStamp;
                try {
                    if (previousEvent !== undefined
                        && currentTime - previousEvent.timeStamp < dblClickTimeThreshold
                    ) {
                        const currentPosition = new THREE.Vector2(upEvent.clientX, upEvent.clientY);
                        const previousPosition = new THREE.Vector2(previousEvent.clientX, previousEvent.clientY);
                        if (currentPosition.distanceTo(previousPosition) <= consummationDistanceThreshold) {
                            this.dblClick(intersects, upEvent);
                        }
                    } else {
                        this.endClick(intersects, upEvent);
                    }
                } finally {
                    this.state.disposable.dispose();
                    this.state = { tag: 'none', previousEvent: upEvent };
                }
                break;
            case 'wheel':
                try {
                    this.endClick([this.state.intersections[this.state.index]], upEvent);
                } finally {
                    this.state.disposable.dispose();
                    this.state = { tag: 'none', previousEvent: upEvent };
                }
                break;
            case 'dragging':
                try {
                    this.endDrag(this.normalizedMousePosition, upEvent);
                } finally {
                    this.state.disposable.dispose();
                    this.state = { tag: 'none' };
                }

                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    onWheel(wheelEvent: WheelEvent) {
        if (!this.enabled) return;

        switch (this.state.tag) {
            case 'down':
                wheelEvent.preventDefault();
                wheelEvent.stopPropagation();
                wheelEvent.stopImmediatePropagation();

                this.viewport.getNormalizedMousePosition(this.state.downEvent, this.normalizedMousePosition);
                const intersections = this.getIntersects(this.normalizedMousePosition, [...this.db.selectableObjects], true);
                if (intersections.length === 0) return;
                this.startHover([intersections[0]], wheelEvent);
                this.state = { tag: 'wheel', intersections, index: 0, disposable: this.state.disposable };
                break;
            case 'wheel': {
                wheelEvent.preventDefault();
                wheelEvent.stopPropagation();
                wheelEvent.stopImmediatePropagation();

                const intersections = this.state.intersections;
                let index = this.state.index + (wheelEvent.deltaY > 0 ? 1 : -1);
                index += intersections.length;
                index %= intersections.length;
                this.continueHover([intersections[index]], wheelEvent);
                this.state = { ...this.state, index };
            }
        }
    }

    abstract startHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent | WheelEvent): void;
    abstract continueHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent | WheelEvent): void;
    abstract endHover(): void;
    abstract startClick(intersections: intersectable.Intersection[], downEvent: MouseEvent): boolean;
    abstract endClick(intersections: intersectable.Intersection[], upEvent: MouseEvent): void;
    abstract startDrag(downEvent: MouseEvent, normalizedMousePosition: THREE.Vector2): void;
    abstract continueDrag(moveEvent: MouseEvent, normalizedMousePosition: THREE.Vector2): void;
    abstract endDrag(normalizedMousePosition: THREE.Vector2, upEvent: MouseEvent): void;
    abstract dblClick(intersections: intersectable.Intersection[], upEvent: MouseEvent): void;

    private getIntersects(normalizedMousePosition: THREE.Vector2, objects: THREE.Object3D[], isXRay = this.viewport.isXRay): intersectable.Intersection[] {
        this.picker.setFromViewport(normalizedMousePosition, this.viewport);
        return this.picker.intersect(objects, isXRay);
    }

    protected selectionModeChanged(selectionMode: SelectionModeSet) {
        if (selectionMode.is(SelectionMode.CurveEdge, SelectionMode.Curve)) {
            this.raycasterParams.Line2.threshold = 50;
        } else {
            const params = defaultRaycasterParams();
            this.raycasterParams.Mesh = params.Mesh;
            this.raycasterParams.Line = params.Line;
            this.raycasterParams.Line2 = params.Line2;
            this.raycasterParams.Points = params.Points;
        }
    }
}

// Time thresholds are in milliseconds,\ distance thresholds are in pixels.
const dragConsummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummatedconst dragConsummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const dblClickTimeThreshold = 300; // once the mouse is down at least this long the drag is consummated
