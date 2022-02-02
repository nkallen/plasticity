import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import * as visual from '../visual_model/VisualModel';
import { SelectionMode } from "../selection/ChangeSelectionExecutor";
import { HasSelection, ToggleableSet } from '../selection/SelectionDatabase';
import { EditorSignals } from './EditorSignals';

export default class LayerManager {
    private readonly _visible = new THREE.Layers();
    private readonly _intersectable = new THREE.Layers();

    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    get intersectable() { return this._intersectable }
    get visible() { return this._visible }

    constructor(private readonly selection: HasSelection, signals: EditorSignals) {
        this.controlPoints = this.controlPoints.bind(this);
        this.selectionModeChanged = this.selectionModeChanged.bind(this);

        const { _visible, _intersectable } = this;

        _visible.enableAll();
        _visible.disable(visual.Layers.CurveFragment);
        _visible.disable(visual.Layers.CurveFragment_XRay);
        _visible.disable(visual.Layers.ControlPoint);

        _intersectable.enableAll();
        _intersectable.disable(visual.Layers.CurveFragment);
        _intersectable.disable(visual.Layers.CurveFragment_XRay);
        _intersectable.disable(visual.Layers.ControlPoint);
        _intersectable.disable(visual.Layers.Unselectable);

        signals.objectSelected.add(this.controlPoints);
        signals.objectDeselected.add(this.controlPoints);
        signals.selectionModeChanged.add(this.selectionModeChanged);
        this.disposable.add(new Disposable(() => {
            signals.objectSelected.remove(this.controlPoints);
            signals.objectDeselected.remove(this.controlPoints);
        }));
    }

    showFragments() {
        const { _visible, _intersectable } = this;
        _visible.enable(visual.Layers.CurveFragment);
        _visible.enable(visual.Layers.CurveFragment_XRay);
        _visible.disable(visual.Layers.Curve);
        _visible.disable(visual.Layers.XRay);

        _intersectable.enable(visual.Layers.CurveFragment);
        _intersectable.enable(visual.Layers.CurveFragment_XRay);
        _intersectable.disable(visual.Layers.Curve);
        _intersectable.disable(visual.Layers.Region);
        _intersectable.disable(visual.Layers.Solid);
        _intersectable.disable(visual.Layers.Face);
    }

    hideFragments() {
        const { _visible, _intersectable } = this;
        _visible.disable(visual.Layers.CurveFragment);
        _visible.disable(visual.Layers.CurveFragment_XRay);
        _visible.enable(visual.Layers.Curve);
        _visible.enable(visual.Layers.XRay);

        _intersectable.disable(visual.Layers.CurveFragment);
        _intersectable.disable(visual.Layers.CurveFragment_XRay);
        _intersectable.enable(visual.Layers.Curve);
        _intersectable.enable(visual.Layers.Region);
        _intersectable.enable(visual.Layers.Solid);
        _intersectable.enable(visual.Layers.Face);
    }

    controlPoints() {
        const { selection } = this;
        if (selection.curves.size > 0 || selection.controlPoints.size > 0)
            this.showControlPoints();
        else this.hideControlPoints();
    }

    private selectionModeChanged(mode: ToggleableSet) {
        const { _visible, _intersectable } = this;
        if (mode.has(SelectionMode.Solid)) {
            _intersectable.enable(visual.Layers.Face);
            _intersectable.enable(visual.Layers.CurveEdge);
        }
        if (mode.has(SelectionMode.Face)) _intersectable.enable(visual.Layers.Face);
        if (mode.has(SelectionMode.CurveEdge)) _intersectable.enable(visual.Layers.CurveEdge);
        if (mode.has(SelectionMode.Curve)) _intersectable.enable(visual.Layers.Curve);
        if (mode.has(SelectionMode.ControlPoint)) _intersectable.enable(visual.Layers.ControlPoint);


        if (!mode.has(SelectionMode.Solid)) {
            if (!mode.has(SelectionMode.Face)) _intersectable.disable(visual.Layers.Face);
            if (!mode.has(SelectionMode.CurveEdge)) _intersectable.disable(visual.Layers.CurveEdge);
        }
        if (!mode.has(SelectionMode.Curve)) _intersectable.disable(visual.Layers.Curve);
        if (!mode.has(SelectionMode.ControlPoint)) _intersectable.disable(visual.Layers.ControlPoint);
    }

    showControlPoints() {
        const { _visible, _intersectable } = this;
        _visible.enable(visual.Layers.ControlPoint);
        _intersectable.enable(visual.Layers.ControlPoint);
    }

    hideControlPoints() {
        const { _visible, _intersectable } = this;
        _visible.disable(visual.Layers.ControlPoint);
        _intersectable.disable(visual.Layers.ControlPoint);
    }

    setXRay(isSet: boolean) {
        const { _visible, _intersectable } = this;
        if (isSet) {
            _visible.enable(visual.Layers.XRay);
            _intersectable.enable(visual.Layers.XRay);
        } else {
            _visible.disable(visual.Layers.XRay);
            _intersectable.disable(visual.Layers.XRay);
        }
    }

    toggleXRay() {
        const { _visible, _intersectable } = this;
        _visible.toggle(visual.Layers.XRay);
        _intersectable.toggle(visual.Layers.XRay);
    }
}