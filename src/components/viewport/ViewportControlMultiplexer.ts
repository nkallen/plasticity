import * as intersectable from "../../visual_model/Intersectable";
import { ViewportControl } from "./ViewportControl";

export class ViewportControlMultiplexer extends ViewportControl {
    private readonly controls: Set<ViewportControl> = new Set();
    private winner?: ViewportControl;

    unshift(first: ViewportControl) {
        const ordered = [...this.controls];
        this.controls.clear();
        this.controls.add(first);
        for (const c of ordered) this.controls.add(c);
    }

    push(...controls: ViewportControl[]) {
        for (const control of controls) {
            this.controls.add(control);
        }
    }

    delete(control: ViewportControl) {
        this.controls.delete(control);
    }

    startHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent) {
        for (const control of this.controls) {
            if (!control.enabled) continue;
            control.startHover(intersections, moveEvent);
        }
    }

    continueHover(intersections: intersectable.Intersection[], moveEvent: MouseEvent) {
        for (const control of this.controls) {
            if (!control.enabled) continue;
            control.continueHover(intersections, moveEvent);
        }
    }

    endHover() {
        for (const control of this.controls) {
            if (!control.enabled) continue;
            control.endHover();
        }
    }

    startDrag(downEvent: MouseEvent, normalizedMousePosition: THREE.Vector2) {
        if (this.winner === undefined) throw new Error("invalid state");
        this.winner.startDrag(downEvent, normalizedMousePosition);
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
        for (const control of this.controls) {
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

}