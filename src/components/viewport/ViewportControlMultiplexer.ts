import { Disposable } from "event-kit";
import * as intersectable from "../../visual_model/Intersectable";
import { ViewportControl } from "./ViewportControl";

export class ViewportControlMultiplexer extends ViewportControl {
    private readonly controls: Set<ViewportControl> = new Set();
    private winner?: ViewportControl;

    add(...controls: ViewportControl[]) {
        for (const control of controls) {
            this.controls.add(control);
            // this.disposable.add(new Disposable(() => {
            //     control.dispose();
            // }))
        }
    }

    remove(control: ViewportControl) {
        this.controls.delete(control);
    }

    startHover(intersections: intersectable.Intersection[]) {
        for (const control of this.controls) {
            control.startHover(intersections);
        }
    }

    continueHover(intersections: intersectable.Intersection[]) {
        for (const control of this.controls) {
            control.continueHover(intersections);
        }
    }

    endHover() {
        for (const control of this.controls) {
            control.endHover();
        }
    }

    startDrag(downEvent: PointerEvent, normalizedMousePosition: THREE.Vector2) {
        if (this.winner === undefined) throw new Error("invalid state");
        this.winner.startDrag(downEvent, normalizedMousePosition);
    }

    continueDrag(moveEvent: PointerEvent, normalizedMousePosition: THREE.Vector2) {
        if (this.winner === undefined) throw new Error("invalid state");
        this.winner.continueDrag(moveEvent, normalizedMousePosition);
    }

    endDrag(normalizedMousePosition: THREE.Vector2) {
        if (this.winner === undefined) throw new Error("invalid state");
        this.winner.endDrag(normalizedMousePosition);
    }

    startClick(intersections: intersectable.Intersection[]) {
        for (const control of this.controls) {
            if (control.startClick(intersections)) {
                this.winner = control;
                return true;
            }
        }
        return false;
    }

    endClick(intersections: intersectable.Intersection[]) {
        if (this.winner === undefined) return;
        this.winner.endClick(intersections);
    }

}