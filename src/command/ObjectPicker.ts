import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { RaycasterParameters } from '../components/viewport/ViewportControl';
import { DatabaseLike } from "../editor/DatabaseLike";
import { EditorSignals } from '../editor/EditorSignals';
import LayerManager from '../editor/LayerManager';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ChangeSelectionExecutor, ChangeSelectionOption, SelectionDelta } from '../selection/ChangeSelectionExecutor';
import { NonemptyClickStrategy } from '../selection/Click';
import { HasSelectedAndHovered, HasSelection, Selectable } from '../selection/SelectionDatabase';
import { SelectionKeypressStrategy } from '../selection/SelectionKeypressStrategy';
import { ControlPointSelection, CurveSelection, EdgeSelection, FaceSelection, RegionSelection, SolidSelection, TypedSelection } from '../selection/TypedSelection';
import { AbstractViewportSelector } from '../selection/ViewportSelector';
import { CancellablePromise } from "../util/CancellablePromise";
import { Raycastable, Intersection, Intersectable } from '../visual_model/Intersectable';
import { RenderedSceneBuilder } from '../visual_model/RenderedSceneBuilder';
import { Executable } from './Quasimode';
import * as visual from '../visual_model/VisualModel';
import { SelectionMode } from '../selection/SelectionModeSet';
import { Scene } from '../editor/Scene';

interface EditorLike {
    db: DatabaseLike;
    viewports: Viewport[];
    signals: EditorSignals;
    materials: MaterialDatabase;
    changeSelection: ChangeSelectionExecutor;
    layers: LayerManager;
    keymaps: AtomKeymap.KeymapManager;
    selection: HasSelectedAndHovered;
    highlighter: RenderedSceneBuilder;
    scene: Scene;
}

export class ObjectPickerViewportSelector extends AbstractViewportSelector {
    private readonly nonempty = new NonemptyClickStrategy(this.editor.db, this.editor.scene, this.selection.mode, this.selection.selected, this.selection.hovered, this.selection.selected);
    private readonly changeSelection = new ChangeSelectionExecutor(this.selection, this.editor.db, this.editor.scene, this.selection.signals, this.prohibitions, this.nonempty);

    constructor(
        viewport: Viewport,
        private readonly editor: EditorLike,
        private readonly selection: HasSelectedAndHovered,
        raycasterParams: RaycasterParameters,
        private readonly prohibitions: ReadonlySet<Selectable>,
        keymapSelector?: string,
    ) {
        super(viewport, editor.layers, editor.db, editor.scene, new SelectionKeypressStrategy(editor.keymaps, keymapSelector), editor.signals, raycasterParams);
    }

    // Normally a viewport selector enqueues a ChangeSelectionCommand; however,
    // This class is used in commands to modify a "temporary" selection
    processClick(intersections: Intersection[], upEvent: MouseEvent) {
        this.changeSelection.onClick(intersections, this.keypress.event2modifier(upEvent), ChangeSelectionOption.None);
    }

    protected processDblClick(intersects: Intersection[], dblClickEvent: MouseEvent) { }

    processBoxSelect(selected: Set<Intersectable>, upEvent: MouseEvent): void {
        this.changeSelection.onBoxSelect(selected, this.keypress.event2modifier(upEvent));
    }

    processHover(intersects: Intersection[], moveEvent?: MouseEvent) {
        this.changeSelection.onHover(intersects, this.keypress.event2modifier(moveEvent), ChangeSelectionOption.None);
    }

    processBoxHover(selected: Set<Intersectable>, moveEvent: MouseEvent): void {
        this.changeSelection.onBoxHover(selected, this.keypress.event2modifier(moveEvent));
    }
}

type CancelableSelectionArray = CancellablePromise<FaceSelection> | CancellablePromise<EdgeSelection> | CancellablePromise<SolidSelection> | CancellablePromise<CurveSelection> | CancellablePromise<ControlPointSelection> | CancellablePromise<EdgeSelection | FaceSelection | RegionSelection | SolidSelection | CurveSelection | ControlPointSelection>

export class ObjectPicker implements Executable<SelectionDelta, HasSelection> {
    readonly selection: HasSelectedAndHovered;

    min = 1; max = 1;
    get mode() { return this.selection.mode }
    private prohibitions: ReadonlySet<Selectable> = new Set();

    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Mesh: { threshold: 0 },
        Line: { threshold: 0.1 },
        Line2: { threshold: 15 },
        Points: { threshold: 10 }
    };

    constructor(private readonly editor: EditorLike, selection?: HasSelectedAndHovered, private readonly keymapSelector?: string) {
        this.selection = selection ?? editor.selection.makeTemporary();
    }

    execute(cb?: (o: SelectionDelta) => void, min = this.min, max = this.max, mode?: SelectionMode): CancellablePromise<HasSelection> {
        if (min <= 0) return CancellablePromise.resolve(this.selection.selected);

        const { editor, selection, selection: { signals } } = this;
        const disposables = new CompositeDisposable();
        if (signals !== editor.signals) {
            const bridgeRemoved = editor.signals.objectRemoved.add(a => signals.objectRemoved.dispatch(a));
            disposables.add(new Disposable(() => bridgeRemoved.detach()));
        }

        if (cb !== undefined) {
            signals.selectionDelta.add(cb);
            disposables.add(new Disposable(() => {
                signals.selectionDelta.remove(cb);
            }));
        }

        if (mode !== undefined) this.mode.set(mode);

        disposables.add(editor.highlighter.useTemporary(selection));

        const cancellable = new CancellablePromise<HasSelection>((resolve, reject) => {
            const finish = () => cancellable.finish();

            let count = 0;
            const selected = signals.selectionDelta.add(delta => {
                count += this.tally(delta.added);
                count -= this.tally(delta.removed);
                count = Math.max(0, count);
                if (count >= min && count >= max) finish();
            });
            disposables.add(new Disposable(() => {
                selected.detach();
            }));

            for (const viewport of this.editor.viewports) {
                const selector = new ObjectPickerViewportSelector(viewport, editor, selection, this.raycasterParams, this.prohibitions, this.keymapSelector);
                disposables.add(viewport.multiplexer.only(selector));
                disposables.add(new Disposable(() => selector.dispose()));
            }

            return {
                dispose: () => disposables.dispose(),
                finish: () => resolve(selection.selected)
            };
        });

        return cancellable;
    }

    private tally(selectable: Set<Selectable>): number {
        let result = 0;
        for (const s of selectable) {
            if (s instanceof visual.Solid) {
                if (this.mode.has(SelectionMode.Solid)) result++;
            } else if (s instanceof visual.SpaceInstance) {
                if (this.mode.has(SelectionMode.Curve)) result++;
            } else if (s instanceof visual.PlaneInstance) {
                if (this.mode.has(SelectionMode.Region)) result++;
            } else if (s instanceof visual.Face) {
                if (this.mode.has(SelectionMode.Face)) result++;
            } else if (s instanceof visual.CurveEdge) {
                if (this.mode.has(SelectionMode.CurveEdge)) result++;
            } else {
                if (this.mode.has(SelectionMode.ControlPoint)) result++;
            }
        }
        return result;
    }

    prohibit(prohibitions: Iterable<Selectable>) {
        this.prohibitions = new Set(prohibitions);
    }

    private get(mode: SelectionMode.Face, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<FaceSelection>;
    private get(mode: SelectionMode.Region, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<RegionSelection>;
    private get(mode: SelectionMode.CurveEdge, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<EdgeSelection>;
    private get(mode: SelectionMode.Solid, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<SolidSelection>;
    private get(mode: SelectionMode.Curve, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<CurveSelection>;
    private get(mode: SelectionMode.ControlPoint, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<ControlPointSelection>;
    private get(mode: SelectionMode, min = 1, max = min, shouldRemove = true): CancelableSelectionArray {
        if (min < 0) throw new Error("min must be > 0");
        if (min === 0) return CancellablePromise.resolve([] as any);

        const result = this.selection.makeTemporary();

        let collection;
        switch (mode) {
            case SelectionMode.Face: collection = mode2collection(SelectionMode.Face, this.selection.selected); break;
            case SelectionMode.Region: collection = mode2collection(SelectionMode.Region, this.selection.selected); break;
            case SelectionMode.CurveEdge: collection = mode2collection(SelectionMode.CurveEdge, this.selection.selected); break;
            case SelectionMode.Solid: collection = mode2collection(SelectionMode.Solid, this.selection.selected); break;
            case SelectionMode.Curve: collection = mode2collection(SelectionMode.Curve, this.selection.selected); break;
            case SelectionMode.ControlPoint: collection = mode2collection(SelectionMode.ControlPoint, this.selection.selected); break;
        }

        if (collection.size >= min) {
            let i = 0;
            for (const item of collection) {
                if (++i > max) break;
                if (shouldRemove) this.selection.selected.remove(item);
                result.selected.add(item);
            }
            switch (mode) {
                case SelectionMode.Face: return CancellablePromise.resolve(mode2collection(SelectionMode.Face, result.selected));
                case SelectionMode.Region: return CancellablePromise.resolve(mode2collection(SelectionMode.Region, result.selected));
                case SelectionMode.CurveEdge: return CancellablePromise.resolve(mode2collection(SelectionMode.CurveEdge, result.selected));
                case SelectionMode.Solid: return CancellablePromise.resolve(mode2collection(SelectionMode.Solid, result.selected));
                case SelectionMode.Curve: return CancellablePromise.resolve(mode2collection(SelectionMode.Curve, result.selected));
                case SelectionMode.ControlPoint: return CancellablePromise.resolve(mode2collection(SelectionMode.ControlPoint, result.selected));
            }
        }

        const picker = new ObjectPicker(this.editor);
        min -= collection.size;
        picker.mode.set(mode);
        picker.min = min;
        picker.max = min;
        picker.copy(this.selection);

        return picker.execute().map(selected => {
            if (!shouldRemove) this.copy(picker.selection);
            let result;
            switch (mode) {
                case SelectionMode.Face: result = mode2collection(SelectionMode.Face, selected); break;
                case SelectionMode.Region: result = mode2collection(SelectionMode.Region, selected); break;
                case SelectionMode.CurveEdge: result = mode2collection(SelectionMode.CurveEdge, selected); break;
                case SelectionMode.Solid: result = mode2collection(SelectionMode.Solid, selected); break;
                case SelectionMode.Curve: result = mode2collection(SelectionMode.Curve, selected); break;
                case SelectionMode.ControlPoint: result = mode2collection(SelectionMode.ControlPoint, selected); break;
            }
            return result;
        }) as CancelableSelectionArray;
    }

    slice(mode: SelectionMode.Face, min?: number, max?: number): CancellablePromise<FaceSelection>;
    slice(mode: SelectionMode.Region, min?: number, max?: number): CancellablePromise<RegionSelection>;
    slice(mode: SelectionMode.CurveEdge, min?: number, max?: number): CancellablePromise<EdgeSelection>;
    slice(mode: SelectionMode.Solid, min?: number, max?: number): CancellablePromise<SolidSelection>;
    slice(mode: SelectionMode.Curve, min?: number, max?: number): CancellablePromise<CurveSelection>;
    slice(mode: SelectionMode.ControlPoint, min?: number, max?: number): CancellablePromise<ControlPointSelection>;
    slice(mode: SelectionMode, min = 1, max = min): CancelableSelectionArray {
        switch (mode) {
            case SelectionMode.Face: return this.get(mode, min, max, false);
            case SelectionMode.Region: return this.get(mode, min, max, false);
            case SelectionMode.CurveEdge: return this.get(mode, min, max, false);
            case SelectionMode.Solid: return this.get(mode, min, max, false);
            case SelectionMode.Curve: return this.get(mode, min, max, false);
            case SelectionMode.ControlPoint: return this.get(mode, min, max, false);
        }
    }

    shift(mode: SelectionMode.Face, min?: number, max?: number): CancellablePromise<FaceSelection>;
    shift(mode: SelectionMode.Region, min?: number, max?: number): CancellablePromise<RegionSelection>;
    shift(mode: SelectionMode.CurveEdge, min?: number, max?: number): CancellablePromise<EdgeSelection>;
    shift(mode: SelectionMode.Solid, min?: number, max?: number): CancellablePromise<SolidSelection>;
    shift(mode: SelectionMode.Curve, min?: number, max?: number): CancellablePromise<CurveSelection>;
    shift(mode: SelectionMode.ControlPoint, min?: number, max?: number): CancellablePromise<ControlPointSelection>;
    shift(mode: SelectionMode, min = 1, max = min): CancelableSelectionArray {
        switch (mode) {
            case SelectionMode.Face: return this.get(mode, min, max, true);
            case SelectionMode.Region: return this.get(mode, min, max, true);
            case SelectionMode.CurveEdge: return this.get(mode, min, max, true);
            case SelectionMode.Solid: return this.get(mode, min, max, true);
            case SelectionMode.Curve: return this.get(mode, min, max, true);
            case SelectionMode.ControlPoint: return this.get(mode, min, max, true);
        }
    }

    copy(selection: HasSelectedAndHovered, ...modes: SelectionMode[]) {
        if (modes.length === 0) modes = [...this.mode];
        this.selection.copy(selection, ...modes);
    }
}

function mode2collection(mode: SelectionMode.Face, selected: HasSelection): FaceSelection;
function mode2collection(mode: SelectionMode.Region, selected: HasSelection): RegionSelection;
function mode2collection(mode: SelectionMode.CurveEdge, selected: HasSelection): EdgeSelection;
function mode2collection(mode: SelectionMode.Curve, selected: HasSelection): CurveSelection;
function mode2collection(mode: SelectionMode.ControlPoint, selected: HasSelection): ControlPointSelection;
function mode2collection(mode: SelectionMode.Solid, selected: HasSelection): SolidSelection;
function mode2collection(mode: SelectionMode, selected: HasSelection): TypedSelection<any, any> {
    let collection;
    switch (mode) {
        case SelectionMode.CurveEdge: collection = selected.edges; break;
        case SelectionMode.Face: collection = selected.faces; break;
        case SelectionMode.Region: collection = selected.regions; break;
        case SelectionMode.Solid: collection = selected.solids; break;
        case SelectionMode.Curve: collection = selected.curves; break;
        case SelectionMode.ControlPoint: collection = selected.controlPoints; break;
    }
    return collection;
}