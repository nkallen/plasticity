import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import * as visual from '../editor/VisualModel';
import { SelectionMode } from "../selection/SelectionInteraction";
import { HasSelection, ToggleableSet } from '../selection/SelectionManager';
import { EditorSignals } from './EditorSignals';

// FIXME: make instance variables of LayerManager, and DI LayerManager where necessary

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
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    constructor(private readonly selection: HasSelection, signals: EditorSignals) {
        this.controlPoints = this.controlPoints.bind(this);
        this.selectionModeChanged = this.selectionModeChanged.bind(this);

        signals.objectSelected.add(this.controlPoints);
        signals.objectDeselected.add(this.controlPoints);
        signals.selectionModeChanged.add(this.selectionModeChanged);
        this.disposable.add(new Disposable(()=>{
            signals.objectSelected.remove(this.controlPoints);
            signals.objectDeselected.remove(this.controlPoints);    
        }));
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

    private selectionModeChanged(mode: ToggleableSet) {
        if (mode.has(SelectionMode.Solid)) {
            IntersectableLayers.enable(visual.Layers.Face);
            IntersectableLayers.enable(visual.Layers.CurveEdge);
        }
        if (mode.has(SelectionMode.Face)) IntersectableLayers.enable(visual.Layers.Face);
        if (mode.has(SelectionMode.CurveEdge)) IntersectableLayers.enable(visual.Layers.CurveEdge);
        if (mode.has(SelectionMode.Curve)) IntersectableLayers.enable(visual.Layers.Curve);
        if (mode.has(SelectionMode.ControlPoint)) IntersectableLayers.enable(visual.Layers.ControlPoint);

        if (!mode.has(SelectionMode.Face)) IntersectableLayers.disable(visual.Layers.Face);
        if (!mode.has(SelectionMode.CurveEdge)) IntersectableLayers.disable(visual.Layers.CurveEdge);
        if (!mode.has(SelectionMode.Curve)) IntersectableLayers.disable(visual.Layers.Curve);
        if (!mode.has(SelectionMode.ControlPoint)) IntersectableLayers.disable(visual.Layers.ControlPoint);
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
            IntersectableLayers.enable(visual.Layers.XRay);
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