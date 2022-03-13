import { CompositeDisposable, Disposable } from "event-kit";
import { SelectionModeSet } from "../../selection/SelectionDatabase";
import * as intersectable from "../../visual_model/Intersectable";
import { RaycasterParameters, ViewportControl } from "./ViewportControl";

type State = { tag: 'None' } | { tag: 'Only', control: ViewportControl, params: RaycasterParameters }

export class ViewportControlMultiplexer extends ViewportControl {
    private _state: State = { tag: 'None' };

    private readonly _controls: Set<ViewportControl> = new Set();
    get controls(): ReadonlySet<ViewportControl> { return this._controls }

    private winner?: ViewportControl;

    only(control: ViewportControl) {
        switch (this._state.tag) {
            case 'None':
                const disposable = new CompositeDisposable();
                for (const control of this._controls) disposable.add(control.enable(false));

                this._controls.add(control);
                disposable.add(new Disposable(() => {
                    if (this._state.tag !== 'Only') throw new Error("invalid precondition");
                    this._controls.delete(control);
                    this._state = { tag: 'None' }
                }));

                const params = { ...this.raycasterParams };
                Object.assign(this.raycasterParams, control.raycasterParams);
                this._state = { tag: 'Only', control, params };
                return disposable;
            default: throw new Error("Invalid state");
        }
    }

    unshift(first: ViewportControl) {
        const ordered = [...this._controls];
        this._controls.clear();
        this._controls.add(first);
        for (const c of ordered) this._controls.add(c);
    }

    push(...controls: ViewportControl[]) {
        for (const control of controls) {
            this._controls.add(control);
        }
    }

    delete(control: ViewportControl) {
        this._controls.delete(control);
    }

    startHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent) {
        for (const control of this._controls) {
            if (!control.enabled) continue;
            control.startHover(intersections, moveEvent);
        }
    }

    continueHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent) {
        for (const control of this._controls) {
            if (!control.enabled) continue;
            control.continueHover(intersections, moveEvent);
        }
    }

    endHover() {
        for (const control of this._controls) {
            if (!control.enabled) continue;
            control.endHover();
        }
    }

    startDrag(downEvent: MouseEvent, normalizedMousePosition: THREE.Vector2) {
        if (this.winner === undefined) throw new Error("invalid state");
        const result = this.winner.startDrag(downEvent, normalizedMousePosition);
        if (!result) {
            this.viewport.navigationControls.onPointerDown(downEvent as PointerEvent);
        }
        return result;
    }

    continueDrag(moveEvent: MouseEvent, normalizedMousePosition: THREE.Vector2) {
        if (this.winner === undefined) throw new Error("invalid state");
        this.winner.continueDrag(moveEvent, normalizedMousePosition);
    }

    endDrag(normalizedMousePosition: THREE.Vector2, upEvent: MouseEvent) {
        if (this.winner === undefined) throw new Error("invalid state");
        this.winner.endDrag(normalizedMousePosition, upEvent);
    }

    startClick(intersections: intersectable.Intersection[], downEvent: MouseEvent) {
        for (const control of this._controls) {
            if (!control.enabled) continue;
            if (control.startClick(intersections, downEvent)) {
                this.winner = control;
                return true;
            }
        }
        return false;
    }

    endClick(intersections: intersectable.Intersection[], upEvent: MouseEvent) {
        if (this.winner === undefined) return;
        this.winner.endClick(intersections, upEvent);
    }

    dblClick(intersections: intersectable.Intersection[], dblClickEvent: MouseEvent) {
        if (this.winner === undefined) return;
        this.winner.dblClick(intersections, dblClickEvent);
    }

    protected override selectionModeChanged(selectionMode: SelectionModeSet) {
        if (this._state.tag === 'Only') return;
        super.selectionModeChanged(selectionMode);
    }
}