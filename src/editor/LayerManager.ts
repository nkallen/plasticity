import { CompositeDisposable } from "event-kit";
import * as THREE from "three";
import { HasSelection } from '../selection/SelectionDatabase';
import { SelectionMode, SelectionModeSet } from "../selection/SelectionModeSet";
import * as visual from '../visual_model/VisualModel';
import { EditorSignals } from './EditorSignals';

export default class LayerManager {
    private readonly _visible = new THREE.Layers();
    private readonly _intersectable = new THREE.Layers();

    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    get intersectable(): ReadonlyLayers { return this._intersectable }
    get visible(): ReadonlyLayers { return this._visible }

    constructor(private readonly selection: HasSelection, private readonly signals: EditorSignals) {
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

        signals.selectionModeChanged.add(this.selectionModeChanged);
    }

    showFragments() {
        const { _visible, _intersectable } = this;
        _visible.enable(visual.Layers.CurveFragment);
        _visible.enable(visual.Layers.CurveFragment_XRay);
        _visible.disable(visual.Layers.Curve);
        _visible.disable(visual.Layers.CurveEdge_XRay);

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
        _visible.enable(visual.Layers.CurveEdge_XRay);

        _intersectable.disable(visual.Layers.CurveFragment);
        _intersectable.disable(visual.Layers.CurveFragment_XRay);
        _intersectable.enable(visual.Layers.Curve);
        _intersectable.enable(visual.Layers.Region);
        _intersectable.enable(visual.Layers.Solid);
        _intersectable.enable(visual.Layers.Face);
    }

    private selectionModeChanged(mode: SelectionModeSet) {
        const { _visible, _intersectable } = this;

        if (mode.has(SelectionMode.Solid)) {
            _intersectable.enable(visual.Layers.Face);
            _intersectable.enable(visual.Layers.CurveEdge);
        } else {
            if (!mode.has(SelectionMode.Face)) _intersectable.disable(visual.Layers.Face);
            if (!mode.has(SelectionMode.CurveEdge)) _intersectable.disable(visual.Layers.CurveEdge);
        }

        if (mode.has(SelectionMode.Face)) {
            _intersectable.enable(visual.Layers.Face);
        }
        if (mode.has(SelectionMode.CurveEdge)) {
            _intersectable.enable(visual.Layers.CurveEdge);
        }

        if (mode.has(SelectionMode.Curve)) {
            _intersectable.enable(visual.Layers.Curve);
        } else {
            _intersectable.disable(visual.Layers.Curve);
        }

        if (mode.has(SelectionMode.ControlPoint)) {
            this.showControlPoints();
        } else {
            this.hideControlPoints();
        }
    }

    showControlPoints() {
        const { _visible, _intersectable, signals } = this;
        _visible.enable(visual.Layers.ControlPoint);
        _intersectable.enable(visual.Layers.ControlPoint);
        signals.visibleLayersChanged.dispatch();
    }

    hideControlPoints() {
        const { _visible, _intersectable, signals } = this;
        _visible.disable(visual.Layers.ControlPoint);
        _intersectable.disable(visual.Layers.ControlPoint);
        signals.visibleLayersChanged.dispatch();
    }

    get isXRay() {
        return this.visible.isEnabled(visual.Layers.CurveEdge_XRay);
    }

    setXRay(isSet: boolean) {
        const { _visible, _intersectable } = this;
        if (isSet) {
            _visible.enable(visual.Layers.CurveEdge_XRay);
            _intersectable.enable(visual.Layers.CurveEdge_XRay);
        } else {
            _visible.disable(visual.Layers.CurveEdge_XRay);
            _intersectable.disable(visual.Layers.CurveEdge_XRay);
        }
    }

    toggleXRay() {
        const { _visible, _intersectable } = this;
        _visible.toggle(visual.Layers.CurveEdge_XRay);
        _intersectable.toggle(visual.Layers.CurveEdge_XRay);
    }

    get isShowingEdges() {
        return this._visible.isEnabled(visual.Layers.CurveEdge);
    }

    set isShowingEdges(show: boolean) {
        const { _visible, _intersectable, signals } = this;
        if (show) {
            _visible.enable(visual.Layers.CurveEdge);
            _intersectable.enable(visual.Layers.CurveEdge);
            _visible.enable(visual.Layers.CurveEdge_XRay);
            _intersectable.enable(visual.Layers.CurveEdge_XRay);
        } else {
            _visible.disable(visual.Layers.CurveEdge);
            _intersectable.disable(visual.Layers.CurveEdge);
            _visible.disable(visual.Layers.CurveEdge_XRay);
            _intersectable.disable(visual.Layers.CurveEdge_XRay);
        }
        signals.visibleLayersChanged.dispatch();
    }

    get isShowingFaces() {
        return this._visible.isEnabled(visual.Layers.Face);
    }

    set isShowingFaces(show: boolean) {
        const { _visible, _intersectable, signals } = this;
        if (show) {
            _visible.enable(visual.Layers.Face);
            _intersectable.enable(visual.Layers.Face);
        } else {
            _visible.disable(visual.Layers.Face);
            _intersectable.disable(visual.Layers.Face);
        }
        signals.visibleLayersChanged.dispatch();
    }
}

export interface ReadonlyLayers {
    mask: number;
    test(layers: THREE.Layers): boolean;
    isEnabled(channel: number): boolean;
}
