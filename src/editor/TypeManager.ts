import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';

export type DisablableType = typeof visual.Solid | typeof visual.Curve3D;

export class TypeManager {
    private readonly disabled = new Set<DisablableType>();

    constructor(private readonly signals: EditorSignals) { }

    enable(type: DisablableType) {
        if (!this.disabled.has(type)) return;
        this.disabled.delete(type);
        this.signals.typeEnabled.dispatch(type);
    }

    disable(type: DisablableType) {
        if (this.disabled.has(type)) return;
        this.disabled.add(type);
        this.signals.typeDisabled.dispatch(type);
    }

    isEnabled(item: DisablableType | visual.Item | visual.TopologyItem): boolean {
        if (item === visual.Solid) {
            return !this.disabled.has(visual.Solid);
        } else if (item === visual.Curve3D) {
            return !this.disabled.has(visual.Curve3D);
        } else if (item instanceof visual.Solid) {
            return !this.disabled.has(visual.Solid);
        } else if (item instanceof visual.SpaceInstance && item.underlying instanceof visual.Curve3D) {
            return !this.disabled.has(visual.Curve3D);
        } else if (item instanceof visual.PlaneInstance && item.underlying instanceof visual.Region) {
            return !this.disabled.has(visual.Curve3D);
        } else return true;
    }
}