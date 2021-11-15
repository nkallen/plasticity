import * as THREE from "three";
import * as visual from '../editor/VisualModel';
import { HasSelection } from '../selection/SelectionManager';
import { EditorSignals } from './EditorSignals';

// FIXME make instance variables of LayerManager, and DI LayerManager where necessary

export const VisibleLayers = new THREE.Layers();
VisibleLayers.enableAll();
VisibleLayers.disable(visual.Layers.CurveFragment);
VisibleLayers.disable(visual.Layers.CurveFragment_XRay);
VisibleLayers.disable(visual.Layers.ControlPoint);

export const IntersectableLayers = new THREE.Layers();
IntersectableLayers.enableAll();
IntersectableLayers.disable(visual.Layers.CurveFragment);
IntersectableLayers.disable(visual.Layers.CurveFragment_XRay);
IntersectableLayers.disable(visual.Layers.ControlPoint);
IntersectableLayers.disable(visual.Layers.Unselectable);

export default class LayerManager {
    constructor(private readonly selection: HasSelection, signals: EditorSignals) {
        signals.objectSelected.add(o => this.controlPoints());
        signals.objectDeselected.add(o => this.controlPoints());
    }

    showFragments() {
        VisibleLayers.enable(visual.Layers.CurveFragment);
        VisibleLayers.enable(visual.Layers.CurveFragment_XRay);
        VisibleLayers.disable(visual.Layers.Curve);
        VisibleLayers.disable(visual.Layers.XRay);

        IntersectableLayers.enable(visual.Layers.CurveFragment);
        IntersectableLayers.enable(visual.Layers.CurveFragment_XRay);
        IntersectableLayers.disable(visual.Layers.Curve);
        IntersectableLayers.disable(visual.Layers.Region);
        IntersectableLayers.disable(visual.Layers.Solid);
        IntersectableLayers.disable(visual.Layers.Face);
    }

    hideFragments() {
        VisibleLayers.disable(visual.Layers.CurveFragment);
        VisibleLayers.disable(visual.Layers.CurveFragment_XRay);
        VisibleLayers.enable(visual.Layers.Curve);
        VisibleLayers.enable(visual.Layers.XRay);

        IntersectableLayers.disable(visual.Layers.CurveFragment);
        IntersectableLayers.disable(visual.Layers.CurveFragment_XRay);
        IntersectableLayers.enable(visual.Layers.Curve);
        IntersectableLayers.enable(visual.Layers.Region);
        IntersectableLayers.enable(visual.Layers.Solid);
        IntersectableLayers.enable(visual.Layers.Face);
    }

    controlPoints() {
        const { selection } = this;
        if (selection.curves.size > 0 || selection.controlPoints.size > 0)
            this.showControlPoints();
        else this.hideControlPoints();
    }

    showControlPoints() {
        VisibleLayers.enable(visual.Layers.ControlPoint);
        IntersectableLayers.enable(visual.Layers.ControlPoint);
    }

    hideControlPoints() {
        VisibleLayers.disable(visual.Layers.ControlPoint);
        IntersectableLayers.disable(visual.Layers.ControlPoint);
    }

    setXRay(isSet: boolean) {
        if (isSet) {
            VisibleLayers.enable(visual.Layers.XRay);
            IntersectableLayers.set(visual.Layers.XRay);
        } else {
            VisibleLayers.disable(visual.Layers.XRay);
            IntersectableLayers.disable(visual.Layers.XRay);
        }
    }

    toggleXRay() {
        VisibleLayers.toggle(visual.Layers.XRay);
        IntersectableLayers.toggle(visual.Layers.XRay);
    }
}