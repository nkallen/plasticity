import { HasSelection } from '../selection/SelectionManager';
import * as visual from '../editor/VisualModel';
import * as SelectableLayers from "./Intersectable";
import { EditorSignals } from './EditorSignals';

export default class LayerManager {
    constructor(private readonly selection: HasSelection, signals: EditorSignals) {
        signals.objectSelected.add(o => this.controlPoints());
        signals.objectDeselected.add(o => this.controlPoints());
    }

    showFragments() {
        visual.VisibleLayers.enable(visual.Layers.CurveFragment);
        visual.VisibleLayers.disable(visual.Layers.Curve);

        SelectableLayers.SelectableLayers.enable(visual.Layers.CurveFragment);
        SelectableLayers.SelectableLayers.disable(visual.Layers.Curve);
        SelectableLayers.SelectableLayers.disable(visual.Layers.Region);
        SelectableLayers.SelectableLayers.disable(visual.Layers.Solid);
        SelectableLayers.SelectableLayers.disable(visual.Layers.Face);
    }

    hideFragments() {
        visual.VisibleLayers.disable(visual.Layers.CurveFragment);
        visual.VisibleLayers.enable(visual.Layers.Curve);

        SelectableLayers.SelectableLayers.disable(visual.Layers.CurveFragment);
        SelectableLayers.SelectableLayers.enable(visual.Layers.Curve);
        SelectableLayers.SelectableLayers.enable(visual.Layers.Region);
        SelectableLayers.SelectableLayers.enable(visual.Layers.Solid);
        SelectableLayers.SelectableLayers.enable(visual.Layers.Face);
    }

    controlPoints() {
        const { selection } = this;
        if (selection.curves.size > 0 || selection.controlPoints.size > 0)
            this.showControlPoints();
        else this.hideControlPoints();
    }

    showControlPoints() {
        visual.VisibleLayers.enable(visual.Layers.ControlPoint);
        SelectableLayers.SelectableLayers.enable(visual.Layers.ControlPoint);
    }

    hideControlPoints() {
        visual.VisibleLayers.disable(visual.Layers.ControlPoint);
        SelectableLayers.SelectableLayers.disable(visual.Layers.ControlPoint);
    }

    toggleXRay() {
        visual.VisibleLayers.toggle(visual.Layers.XRay);
        SelectableLayers.SelectableLayers.toggle(visual.Layers.XRay);
    }
}