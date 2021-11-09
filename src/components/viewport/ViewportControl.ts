import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { DatabaseLike } from "../../editor/GeometryDatabase";
import * as intersectable from "../../editor/Intersectable";
import { GPUPicker } from "./GPUPicking";
import { Viewport } from "./Viewport";

type State = { tag: 'none' } | { tag: 'hover' } | { tag: 'down', downEvent: PointerEvent, disposable: Disposable } | { tag: 'dragging', downEvent: PointerEvent, startEvent: PointerEvent, disposable: Disposable }

const defaultRaycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
    Mesh: { threshold: 0 },
    Line: { threshold: 0.1 },
    Line2: { threshold: 15 },
    Points: { threshold: 10 }
};

export abstract class ViewportControl extends THREE.EventDispatcher {
    private _enabled = true;
    get enabled() { return this._enabled }
    set enabled(enabled: boolean) {
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
    }

    private state: State = { tag: 'none' }

    private readonly raycaster = new GPUPicker(this.db, this.viewport);

    private readonly normalizedMousePosition = new THREE.Vector2(); // normalized device coordinates
    private readonly onDownPosition = new THREE.Vector2(); // screen coordinates
    private readonly currentPosition = new THREE.Vector2(); // screen coordinates

    private readonly disposable = new CompositeDisposable();

    constructor(
        protected readonly viewport: Viewport,
        protected readonly db: DatabaseLike,
        readonly raycasterParams: THREE.RaycasterParameters = Object.assign({}, defaultRaycasterParams),
    ) {
        super();

        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);

        const domElement = viewport.domElement;
        domElement.addEventListener('pointerdown', this.onPointerDown);
        domElement.addEventListener('pointermove', this.onPointerMove);
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointerdown', this.onPointerDown)));
        this.disposable.add(new Disposable(() => domElement.removeEventListener('pointermove', this.onPointerMove)));
    }

    onPointerDown(downEvent: PointerEvent) {
        if (!this.enabled) return;
        if (downEvent.button !== 0) return;

        switch (this.state.tag) {
            case 'hover':
                this.endHover();
            case 'none':
                getMousePosition(this.viewport.domElement, downEvent.clientX, downEvent.clientY, this.onDownPosition);

                const intersects = this.getIntersects(this.currentPosition, this.db.visibleObjects);
                if (!this.startClick(intersects)) return;

                const disposable = new CompositeDisposable();

                document.addEventListener('pointerup', this.onPointerUp);
                document.addEventListener('pointermove', this.onPointerMove);
                disposable.add(new Disposable(() => document.removeEventListener('pointermove', this.onPointerMove)));
                disposable.add(new Disposable(() => document.removeEventListener('pointerup', this.onPointerUp)));
                disposable.add(new Disposable(() => this.dispatchEvent({ type: 'end' })));

                downEvent.preventDefault();
                downEvent.stopPropagation();
                downEvent.stopImmediatePropagation();

                this.state = { tag: 'down', disposable, downEvent };

                this.dispatchEvent({ type: 'start' });
                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    onPointerMove(moveEvent: PointerEvent) {
        if (!this.enabled) return;

        getMousePosition(this.viewport.domElement, moveEvent.clientX, moveEvent.clientY, this.currentPosition);

        switch (this.state.tag) {
            case 'none': {
                const intersects = this.getIntersects(this.currentPosition, this.db.visibleObjects);
                if (intersects.length === 0) break;
                this.startHover(intersects);
                this.state = { tag: 'hover' };
                break;
            }
            case 'hover': {
                const intersects = this.getIntersects(this.currentPosition, this.db.visibleObjects);
                if (intersects.length === 0) {
                    this.endHover();
                    this.state = { tag: 'none' };
                }
                else this.continueHover(intersects);
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
                    screen2normalized(this.onDownPosition, this.normalizedMousePosition);
                    this.startDrag(downEvent, this.normalizedMousePosition);

                    this.state = { tag: 'dragging', downEvent, disposable, startEvent: moveEvent }
                }

                break;
            }
            case 'dragging':
                screen2normalized(this.currentPosition, this.normalizedMousePosition);
                this.continueDrag(moveEvent, this.normalizedMousePosition);

                break;
        }
    }

    onPointerUp(upEvent: PointerEvent) {
        if (!this.enabled) return;
        if (upEvent.button !== 0) return;

        getMousePosition(this.viewport.domElement, upEvent.clientX, upEvent.clientY, this.currentPosition);

        switch (this.state.tag) {
            case 'down':
                const intersects = this.getIntersects(this.currentPosition, [...this.db.visibleObjects]);
                this.endClick(intersects);

                this.state.disposable.dispose();
                this.state = { tag: 'none' };

                break;
            case 'dragging':
                screen2normalized(this.currentPosition, this.normalizedMousePosition);
                this.endDrag(this.normalizedMousePosition);

                this.state.disposable.dispose();
                this.state = { tag: 'none' };

                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    protected abstract startHover(intersections: intersectable.Intersectable[]): void;
    protected abstract continueHover(intersections: intersectable.Intersectable[]): void;
    protected abstract endHover(): void;
    protected abstract startClick(intersections: intersectable.Intersectable[]): boolean;
    protected abstract endClick(intersections: intersectable.Intersectable[]): void;
    protected abstract startDrag(downEvent: PointerEvent, normalizedMousePosition: THREE.Vector2): void;
    protected abstract continueDrag(moveEvent: PointerEvent, normalizedMousePosition: THREE.Vector2): void;
    protected abstract endDrag(normalizedMousePosition: THREE.Vector2): void;

    private getIntersects(screenPoint: THREE.Vector2, objects: THREE.Object3D[]): intersectable.Intersectable[] {
        return this.raycaster.intersect(screenPoint);
    }

    dispose() { this.disposable.dispose() }
}

function screen2normalized(from: THREE.Vector2, to: THREE.Vector2) {
    to.set((from.x * 2) - 1, - (from.y * 2) + 1);
}

function getMousePosition(dom: HTMLElement, x: number, y: number, to: THREE.Vector2) {
    const rect = dom.getBoundingClientRect();
    to.set((x - rect.left), rect.height - (y - rect.top));
}

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated