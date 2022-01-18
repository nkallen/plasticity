import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from "../editor/DatabaseLike";
import LayerManager from '../editor/LayerManager';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ChangeSelectionExecutor, SelectionMode } from '../selection/ChangeSelectionExecutor';
import { HasSelectedAndHovered, HasSelection } from '../selection/SelectionDatabase';
import { ControlPointSelection, CurveSelection, EdgeSelection, FaceSelection, SolidSelection, TypedSelection } from '../selection/TypedSelection';
import { AbstractViewportSelector } from '../selection/ViewportSelector';
import { CancellablePromise } from "../util/CancellablePromise";
import { Intersectable, Intersection } from '../visual_model/Intersectable';
import { Executable } from './Quasimode';
import { RenderedSceneBuilder } from '../visual_model/RenderedSceneBuilder';

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
}

export class ObjectPickerViewportSelector extends AbstractViewportSelector {
    private changeSelection = new ChangeSelectionExecutor(this.selection, this.editor.db, this.selection.signals);

    constructor(
        viewport: Viewport,
        private readonly editor: EditorLike,
        private readonly selection: HasSelectedAndHovered,
        raycasterParams: THREE.RaycasterParameters,
        keymapSelector?: string,
    ) {
        super(viewport, editor.layers, editor.db, editor.keymaps, editor.signals, raycasterParams, keymapSelector);
    }

    // Normally a viewport selector enqueues a ChangeSelectionCommand; however,
    // This class is used in commands to modify a "temporary" selection
    processClick(intersections: Intersection[], upEvent: MouseEvent) {
        if (intersections.length === 0) return;
        this.changeSelection.onClick(intersections, this.event2modifier(upEvent), this.event2option(upEvent));
    }

    protected processDblClick(intersects: Intersection[], dblClickEvent: MouseEvent) {

    }

    processBoxSelect(selected: Set<Intersectable>, upEvent: MouseEvent): void {
        this.changeSelection.onBoxSelect(selected, this.event2modifier(upEvent));
    }

    // NOTE: while the selection.selected is a temporary collection just for this class,
    // typically it will use the real selection.hovered to provide user feedback.
    processHover(intersects: Intersection[], moveEvent?: MouseEvent) {
        this.changeSelection.onHover(intersects, this.event2modifier(moveEvent), this.event2option(moveEvent));
    }

    processBoxHover(selected: Set<Intersectable>, moveEvent: MouseEvent): void {
        this.changeSelection.onBoxHover(selected, this.event2modifier(moveEvent));
    }
}

type CancelableSelectionArray = CancellablePromise<FaceSelection> | CancellablePromise<EdgeSelection> | CancellablePromise<SolidSelection> | CancellablePromise<CurveSelection> | CancellablePromise<ControlPointSelection>

export class ObjectPicker implements Executable<HasSelection, HasSelection> {
    readonly selection: HasSelectedAndHovered;
    min = 1;
    max = 1;
    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Mesh: { threshold: 0 },
        Line: { threshold: 0.1 },
        Line2: { threshold: 15 },
        Points: { threshold: 10 }
    };

    constructor(private readonly editor: EditorLike, selection?: HasSelectedAndHovered, private readonly keymapSelector?: string) {
        this.selection = selection ?? editor.selection.makeTemporary();
    }

    get mode() { return this.selection.mode }

    execute(cb?: (o: HasSelection) => void, min = this.min, max = this.max, mode?: SelectionMode): CancellablePromise<HasSelection> {
        const { editor, selection, selection: { signals } } = this;
        const disposables = new CompositeDisposable();
        if (signals !== editor.signals) {
            const bridgeRemoved = editor.signals.objectRemoved.add(a => signals.objectRemoved.dispatch(a));
            disposables.add(new Disposable(() => bridgeRemoved.detach()));
        }

        if (cb !== undefined) {
            const k = () => cb(selection.selected);
            signals.selectionDelta.add(k);
            disposables.add(new Disposable(() => {
                signals.selectionDelta.remove(k);
            }));
        }

        if (mode !== undefined) this.mode.set(mode);

        disposables.add(editor.highlighter.useTemporary(selection));

        const cancellable = new CancellablePromise<HasSelection>((resolve, reject) => {
            const finish = () => cancellable.finish();

            let count = 0;
            const selected = signals.objectSelected.add(() => {
                count++; if (count >= min && count >= max) finish();
            });
            const deselected = signals.objectDeselected.add(() => count--);
            disposables.add(new Disposable(() => {
                selected.detach();
                deselected.detach();
            }));

            for (const viewport of this.editor.viewports) {
                const selector = new ObjectPickerViewportSelector(viewport, editor, selection, this.raycasterParams, this.keymapSelector);
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

    private get(mode: SelectionMode.Face, min?: number, max?: number, shouldMutate?: boolean): CancellablePromise<FaceSelection>;
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
                case SelectionMode.CurveEdge: result = mode2collection(SelectionMode.CurveEdge, selected); break;
                case SelectionMode.Solid: result = mode2collection(SelectionMode.Solid, selected); break;
                case SelectionMode.Curve: result = mode2collection(SelectionMode.Curve, selected); break;
                case SelectionMode.ControlPoint: result = mode2collection(SelectionMode.ControlPoint, selected); break;
            }
            return result;
        }) as CancelableSelectionArray;
    }

    slice(mode: SelectionMode.Face, min?: number, max?: number): CancellablePromise<FaceSelection>;
    slice(mode: SelectionMode.CurveEdge, min?: number, max?: number): CancellablePromise<EdgeSelection>;
    slice(mode: SelectionMode.Solid, min?: number, max?: number): CancellablePromise<SolidSelection>;
    slice(mode: SelectionMode.Curve, min?: number, max?: number): CancellablePromise<CurveSelection>;
    slice(mode: SelectionMode.ControlPoint, min?: number, max?: number): CancellablePromise<ControlPointSelection>;
    slice(mode: SelectionMode, min = 1, max = min): CancelableSelectionArray {
        switch (mode) {
            case SelectionMode.Face: return this.get(mode, min, max, false);
            case SelectionMode.CurveEdge: return this.get(mode, min, max, false);
            case SelectionMode.Solid: return this.get(mode, min, max, false);
            case SelectionMode.Curve: return this.get(mode, min, max, false);
            case SelectionMode.ControlPoint: return this.get(mode, min, max, false);
        }
    }

    shift(mode: SelectionMode.Face, min?: number, max?: number): CancellablePromise<FaceSelection>;
    shift(mode: SelectionMode.CurveEdge, min?: number, max?: number): CancellablePromise<EdgeSelection>;
    shift(mode: SelectionMode.Solid, min?: number, max?: number): CancellablePromise<SolidSelection>;
    shift(mode: SelectionMode.Curve, min?: number, max?: number): CancellablePromise<CurveSelection>;
    shift(mode: SelectionMode.ControlPoint, min?: number, max?: number): CancellablePromise<ControlPointSelection>;
    shift(mode: SelectionMode, min = 1, max = min): CancelableSelectionArray {
        switch (mode) {
            case SelectionMode.Face: return this.get(mode, min, max, true);
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
function mode2collection(mode: SelectionMode.CurveEdge, selected: HasSelection): EdgeSelection;
function mode2collection(mode: SelectionMode.Curve, selected: HasSelection): CurveSelection;
function mode2collection(mode: SelectionMode.ControlPoint, selected: HasSelection): ControlPointSelection;
function mode2collection(mode: SelectionMode.Solid, selected: HasSelection): SolidSelection;
function mode2collection(mode: SelectionMode, selected: HasSelection): TypedSelection<any, any> {
    let collection;
    switch (mode) {
        case SelectionMode.CurveEdge: collection = selected.edges; break;
        case SelectionMode.Face: collection = selected.faces; break;
        case SelectionMode.Solid: collection = selected.solids; break;
        case SelectionMode.Curve: collection = selected.curves; break;
        case SelectionMode.ControlPoint: collection = selected.controlPoints; break;
    }
    return collection;
}