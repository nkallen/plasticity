import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { EditorSignals } from "../../editor/EditorSignals";
import { DatabaseLike } from "../../editor/DatabaseLike";
import LayerManager from "../../editor/LayerManager";
import { AtomicRef } from "../../util/Util";
import { GeometryPicker } from "../../visual_model/GeometryPicker";
import * as intersectable from "../../visual_model/Intersectable";
import { Viewport } from "./Viewport";

type State = { tag: 'none', last?: MouseEvent } | { tag: 'hover', last?: MouseEvent } | { tag: 'down', downEvent: MouseEvent, disposable: Disposable, last?: MouseEvent } | { tag: 'dragging', downEvent: MouseEvent, startEvent: MouseEvent, disposable: Disposable } | { tag: 'wheel', intersections: intersectable.Intersection[], index: number, disposable: Disposable }

export const defaultRaycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
    Mesh: { threshold: 0 },
    Line: { threshold: 0.1 },
    Line2: { threshold: 15 },
    Points: { threshold: 20 }
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
        readonly raycasterParams: THREE.RaycasterParameters = { ...defaultRaycasterParams },
    ) {
        super();

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onWheel = this.onWheel.bind(this);
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

                const intersects = this.getIntersects(this.normalizedMousePosition, this.db.visibleObjects);
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

                this.state = { tag: 'down', disposable, downEvent, last: this.state.last };

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
                const intersects = this.getIntersects(this.normalizedMousePosition, this.db.visibleObjects);
                if (intersects.length === 0) break;
                this.startHover(intersects, moveEvent);
                this.state = { tag: 'hover', last: this.state.last };
                break;
            }
            case 'hover': {
                const intersects = this.getIntersects(this.normalizedMousePosition, this.db.visibleObjects);
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

                if (moveEvent.timeStamp - dragStartTime >= consummationTimeThreshold ||
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
                const intersects = this.getIntersects(this.normalizedMousePosition, [...this.db.visibleObjects]);
                const currentTime = upEvent.timeStamp;
                try {
                    if (this.state.last !== undefined && currentTime - this.state.last.timeStamp < consummationTimeThreshold) {
                        this.dblClick(intersects, upEvent);
                    } else {
                        this.endClick(intersects, upEvent);
                    }
                } finally {
                    this.state.disposable.dispose();
                    this.state = { tag: 'none', last: upEvent };
                }
                break;
            case 'wheel':
                try {
                    this.endClick([this.state.intersections[this.state.index]], upEvent);
                } finally {
                    this.state.disposable.dispose();
                    this.state = { tag: 'none', last: upEvent };
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
                const intersections = this.getIntersects(this.normalizedMousePosition, [...this.db.visibleObjects], true);
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
}

// Time thresholds are in milliseconds,\ distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated