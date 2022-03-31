import { EditorSignals } from '../editor/EditorSignals';

export enum SelectionMode {
    CurveEdge, Face, Region, Solid, Curve, ControlPoint
}

export const SelectionModeAll = [SelectionMode.CurveEdge, SelectionMode.Face, SelectionMode.Region, SelectionMode.Solid, SelectionMode.Curve, SelectionMode.ControlPoint];


export class SelectionModeSet extends Set<SelectionMode> {
    constructor(values: SelectionMode[], private readonly signals: EditorSignals) {
        super(values);
    }

    toggle(...elements: SelectionMode[]) {
        for (const element of elements) {
            if (this.has(element))
                this.delete(element);
            else
                this.add(element);
        }
        this.signals.selectionModeChanged.dispatch(this);
    }

    set(...elements: SelectionMode[]) {
        this.clear();
        for (const element of elements) {
            this.add(element);
        }
        this.signals.selectionModeChanged.dispatch(this);
    }

    is(...elements: SelectionMode[]) {
        if (this.size !== elements.length)
            return false;
        for (const element of elements) {
            if (!this.has(element))
                return false;
        }
        return true;
    }
}
