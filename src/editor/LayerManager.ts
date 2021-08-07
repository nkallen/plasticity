import { HasSelection } from '../selection/SelectionManager';
import * as visual from '../editor/VisualModel';
import { EditorSignals } from './EditorSignals';

export default class LayerManager {
    constructor(private readonly selection: HasSelection, signals: EditorSignals) {
        signals.objectSelected.add(o => this.controlPoints());
        signals.objectDeselected.add(o => this.controlPoints());
    }

    showFragments() {
        visual.VisibleLayers.enable(visual.Layers.CurveFragment);
        visual.VisibleLayers.disable(visual.Layers.Curve);

        visual.SelectableLayers.enable(visual.Layers.CurveFragment);
        visual.SelectableLayers.disable(visual.Layers.Curve);
        visual.SelectableLayers.disable(visual.Layers.Region);
        visual.SelectableLayers.disable(visual.Layers.Solid);
        visual.SelectableLayers.disable(visual.Layers.Face);
    }

    hideFragments() {
        visual.VisibleLayers.disable(visual.Layers.CurveFragment);
        visual.VisibleLayers.enable(visual.Layers.Curve);

        visual.SelectableLayers.disable(visual.Layers.CurveFragment);
        visual.SelectableLayers.enable(visual.Layers.Curve);
        visual.SelectableLayers.enable(visual.Layers.Region);
        visual.SelectableLayers.enable(visual.Layers.Solid);
        visual.SelectableLayers.enable(visual.Layers.Face);
    }

    controlPoints() {
        const { selection } = this;
        if (selection.curves.size > 0 || selection.controlPoints.size > 0)
            this.showControlPoints();
        else this.hideControlPoints();
    }

    showControlPoints() {
        visual.VisibleLayers.enable(visual.Layers.ControlPoint);
    }

    hideControlPoints() {
        visual.VisibleLayers.disable(visual.Layers.ControlPoint);

    }
}