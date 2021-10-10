import { HasSelection } from '../selection/SelectionManager';
import * as visual from '../editor/VisualModel';
import * as intersectable from "./Intersectable";
import { EditorSignals } from './EditorSignals';

export default class LayerManager {
    constructor(private readonly selection: HasSelection, signals: EditorSignals) {
        signals.objectSelected.add(o => this.controlPoints());
        signals.objectDeselected.add(o => this.controlPoints());
    }

    showFragments() {
        visual.VisibleLayers.enable(visual.Layers.CurveFragment);
        visual.VisibleLayers.enable(visual.Layers.CurveFragment_XRay);
        visual.VisibleLayers.disable(visual.Layers.Curve);

        intersectable.IntersectableLayers.enable(visual.Layers.CurveFragment);
        intersectable.IntersectableLayers.enable(visual.Layers.CurveFragment_XRay);
        intersectable.IntersectableLayers.disable(visual.Layers.Curve);
        intersectable.IntersectableLayers.disable(visual.Layers.Region);
        intersectable.IntersectableLayers.disable(visual.Layers.Solid);
        intersectable.IntersectableLayers.disable(visual.Layers.Face);
    }

    hideFragments() {
        visual.VisibleLayers.disable(visual.Layers.CurveFragment);
        visual.VisibleLayers.disable(visual.Layers.CurveFragment_XRay);
        visual.VisibleLayers.enable(visual.Layers.Curve);

        intersectable.IntersectableLayers.disable(visual.Layers.CurveFragment);
        intersectable.IntersectableLayers.disable(visual.Layers.CurveFragment_XRay);
        intersectable.IntersectableLayers.enable(visual.Layers.Curve);
        intersectable.IntersectableLayers.enable(visual.Layers.Region);
        intersectable.IntersectableLayers.enable(visual.Layers.Solid);
        intersectable.IntersectableLayers.enable(visual.Layers.Face);
    }

    controlPoints() {
        const { selection } = this;
        if (selection.curves.size > 0 || selection.controlPoints.size > 0)
            this.showControlPoints();
        else this.hideControlPoints();
    }

    showControlPoints() {
        visual.VisibleLayers.enable(visual.Layers.ControlPoint);
        intersectable.IntersectableLayers.enable(visual.Layers.ControlPoint);
    }

    hideControlPoints() {
        visual.VisibleLayers.disable(visual.Layers.ControlPoint);
        intersectable.IntersectableLayers.disable(visual.Layers.ControlPoint);
    }

    toggleXRay() {
        visual.VisibleLayers.toggle(visual.Layers.XRay);
        intersectable.IntersectableLayers.toggle(visual.Layers.XRay);
    }
}