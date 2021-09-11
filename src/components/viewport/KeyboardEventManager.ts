import KeymapManager from "atom-keymap";
import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import { Pane } from "../pane/Pane";

// Time thresholds are in milliseconds, distance thresholds are in pixels.
const consummationTimeThreshold = 200; // once the mouse is down at least this long the drag is consummated
const consummationDistanceThreshold = 4; // once the mouse moves at least this distance the drag is consummated

type State = { tag: 'none' } | { tag: 'down', downEvent: PointerEvent, disposable: Disposable }

export default class KeyboardEventManager {
    private state: State = { tag: 'none' };
    private readonly disposable = new CompositeDisposable();

    constructor(private readonly keymaps: AtomKeymap.KeymapManager) {
        this.onPointerDown = this.onPointerDown.bind(this);
        this.onPointerMove = this.onPointerMove.bind(this);
        this.onPointerUp = this.onPointerUp.bind(this);
        this.onWheelEvent = this.onWheelEvent.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);

        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('pointerdown', this.onPointerDown);
        window.addEventListener('wheel', this.onWheelEvent, { capture: true, passive: false });
        window.addEventListener('pointermove', this.onPointerMove);
        this.disposable.add(new Disposable(() => {
            window.removeEventListener('keydown', this.onKeyDown);
            window.removeEventListener('pointerdown', this.onPointerDown);
            window.removeEventListener('wheel', this.onWheelEvent, { capture: true });
            window.removeEventListener('pointermove', this.onPointerMove);
        }));
    }

    private lastTarget?: HTMLElement;

    onPointerMove(e: PointerEvent) {
        const target = e.target;
        if (target instanceof HTMLElement) {
            this.lastTarget = target;
        }
    }

    onPointerDown(e: PointerEvent) {
        switch (this.state.tag) {
            case 'none':
                const disposables = new CompositeDisposable();

                if (e.button != 2) return;

                window.addEventListener('pointerup', this.onPointerUp);
                disposables.add(new Disposable(() => window.removeEventListener('pointerup', this.onPointerUp)));
                this.state = { tag: 'down', downEvent: e, disposable: disposables };
                break;
            default: throw new Error('invalid state: ' + this.state.tag);
        }
    }

    onPointerUp(e: PointerEvent) {
        switch (this.state.tag) {
            case 'down': {
                const { downEvent, disposable } = this.state;
                if (e.pointerId !== downEvent.pointerId) return;

                const currentPosition = new THREE.Vector2(e.clientX, e.clientY);
                const startPosition = new THREE.Vector2(downEvent.clientX, downEvent.clientY);
                const dragStartTime = downEvent.timeStamp;

                if (e.timeStamp - dragStartTime < consummationTimeThreshold &&
                    currentPosition.distanceTo(startPosition) < consummationDistanceThreshold
                ) {
                    // FIXME need to map ctrlKey->ctrl and fix the incorrect types.
                    // @ts-expect-error
                    this.keymaps.handleKeyboardEvent(KeymapManager.buildKeydownEvent('mouse2', e));
                }

                disposable.dispose();
                this.state = { tag: 'none' };

                break;
            }
            case 'none':
                break;
        }
    }

    onWheelEvent(event: WheelEvent) {
        const e = (event.deltaY > 0) ?
            this.wheel2keyboard('wheel+up', event) :
            this.wheel2keyboard('wheel+down', event);
        this.keymaps.handleKeyboardEvent(e);
    }

    onKeyDown(event: KeyboardEvent) {
        const lastTarget = this.lastTarget;
        if (lastTarget === undefined) return;
        
        Object.defineProperty(event, 'target', { value: lastTarget });
        this.keymaps.handleKeyboardEvent(event);
    }

    private wheel2keyboard(name: string, event: WheelEvent): KeyboardEvent {
        const e = KeymapManager.buildKeydownEvent(name, event as any) as unknown as KeyboardEvent;
        // NOTE: because wheel events are ALSO listened for by the viewport orbit controls, it's important
        // to allow the original event to be stopped if something takes precedence.
        const stopPropagation = e.stopPropagation.bind(e);
        Object.defineProperty(e, 'stopPropagation', {
            value() {
                event.stopPropagation();
                stopPropagation();
            }
        });
        const preventDefault = e.preventDefault.bind(e);
        Object.defineProperty(e, 'preventDefault', {
            value() {
                event.preventDefault();
                preventDefault();
            }
        });
        return e;
    }

    dispose() {
        this.disposable.dispose();
    }
}