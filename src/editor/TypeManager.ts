import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';

export type DisablableType = typeof visual.Solid | typeof visual.Curve3D;

export class TypeManager {
    private readonly disabled = new Set<DisablableType>();

    constructor(private readonly signals: EditorSignals) {

    }

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

    isEnabled(type: DisablableType): boolean {
        return !this.disabled.has(type);
    }
}