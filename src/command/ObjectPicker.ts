import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import LayerManager from '../editor/LayerManager';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ChangeSelectionExecutor, SelectionMode } from '../selection/ChangeSelectionExecutor';
import { HasSelectedAndHovered, HasSelection, ToggleableSet } from '../selection/SelectionDatabase';
import { AbstractViewportSelector } from '../selection/ViewportSelector';
import { CancellablePromise } from "../util/CancellablePromise";
import { Intersectable, Intersection } from '../visual_model/Intersectable';
import * as visual from "../visual_model/VisualModel";
import { Executable } from './Quasimode';

interface EditorLike {
    db: DatabaseLike;
    viewports: Viewport[];
    signals: EditorSignals;
    materials: MaterialDatabase;
    changeSelection: ChangeSelectionExecutor;
    layers: LayerManager;
    keymaps: AtomKeymap.KeymapManager;
    selection: HasSelectedAndHovered;
}

export class ObjectPickerViewportSelector extends AbstractViewportSelector {
    private changeSelection = new ChangeSelectionExecutor(this.selection, this.editor.db, this.editor.signals);

    constructor(
        viewport: Viewport,
        private readonly editor: EditorLike,
        private readonly selection: HasSelectedAndHovered,
        private readonly onEmptyIntersection = () => { },
        raycasterParams: THREE.RaycasterParameters,
        keymapSelector?: string,
    ) {
        super(viewport, editor.layers, editor.db, editor.keymaps, editor.signals, raycasterParams, keymapSelector);
    }

    // Normally a viewport selector enqueues a ChangeSelectionCommand; however,
    // This class is used in commands to modify a "temporary" selection
    processClick(intersections: Intersection[], upEvent: MouseEvent) {
        this.changeSelection.onClick(intersections, this.event2modifier(upEvent), this.event2option(upEvent));
        if (intersections.length === 0) this.onEmptyIntersection();
    }

    protected processDblClick(intersects: Intersection[], dblClickEvent: MouseEvent) {

    }

    processBoxSelect(selected: Set<Intersectable>, upEvent: MouseEvent): void {
        this.changeSelection.onBoxSelect(selected, this.event2modifier(upEvent));
        if (selected.size === 0) this.onEmptyIntersection();
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

type SelectionArray = visual.Face[] | visual.CurveEdge[] | visual.Solid[] | visual.SpaceInstance<visual.Curve3D>[] | visual.ControlPoint[];
type CancelableSelectionArray = CancellablePromise<visual.Face[]> | CancellablePromise<visual.CurveEdge[]> | CancellablePromise<visual.Solid[]> | CancellablePromise<visual.SpaceInstance<visual.Curve3D>[]> | CancellablePromise<visual.ControlPoint[]>
type PromiseSelectionArray = Promise<visual.Face[]> | Promise<visual.CurveEdge[]> | Promise<visual.Solid[]> | Promise<visual.SpaceInstance<visual.Curve3D>>[] | Promise<visual.ControlPoint[]>

export class ObjectPicker implements Executable<HasSelection, HasSelection> {
    private readonly selection: HasSelectedAndHovered;
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

    execute(cb?: (o: HasSelection) => void): CancellablePromise<HasSelection> {
        const { editor, selection, selection: { signals } } = this;
        const disposables = new CompositeDisposable();
        if (signals !== editor.signals) {
            editor.signals.objectRemoved.add(a => signals.objectRemoved.dispatch(a));
            disposables.add(new Disposable(() => editor.signals.objectRemoved.remove(signals.objectRemoved.dispatch)));
        }

        if (cb !== undefined) {
            const k = () => cb(selection.selected);
            signals.objectSelected.add(k);
            signals.objectDeselected.add(k);
            disposables.add(new Disposable(() => {
                signals.objectSelected.remove(k);
                signals.objectDeselected.remove(k);
            }));
        }

        const cancellable = new CancellablePromise<HasSelection>((resolve, reject) => {
            const finish = () => cancellable.finish();
            const { min, max } = this;

            let count = 0;
            signals.objectSelected.add(() => {
                count++;
                if (count >= min && count >= max) finish();
            });
            disposables.add(new Disposable(() => signals.objectSelected.remove(finish)));

            for (const viewport of this.editor.viewports) {
                const reenable = viewport.disableControls(viewport.navigationControls); // FIXME: is this correct?
                disposables.add(reenable);

                const selector = new ObjectPickerViewportSelector(viewport, editor, selection, finish, this.raycasterParams, this.keymapSelector);
                selector.addEventLiseners();

                disposables.add(new Disposable(() => selector.dispose()));
            }

            return {
                dispose: () => disposables.dispose(),
                finish: () => resolve(selection.selected)
            };
        });
        return cancellable;
    }

    get(mode: SelectionMode.Face, min?: number): CancellablePromise<visual.Face[]>;
    get(mode: SelectionMode.CurveEdge, min?: number): CancellablePromise<visual.CurveEdge[]>;
    get(mode: SelectionMode.Solid, min?: number): CancellablePromise<visual.Solid[]>;
    get(mode: SelectionMode.Curve, min?: number): CancellablePromise<visual.SpaceInstance<visual.Curve3D>[]>;
    get(mode: SelectionMode.ControlPoint, min?: number): CancellablePromise<visual.ControlPoint[]>;
    get(mode: SelectionMode, min = 1): CancelableSelectionArray {
        if (min < 0) throw new Error("min must be > 0");
        if (min === 0) return CancellablePromise.resolve([]);

        const { editor, editor: { selection: { selected } } } = this;
        let collection: any[];
        collection = mode2collection(mode, selected);
        if (collection.length >= min) return CancellablePromise.resolve(collection) as CancelableSelectionArray;

        min -= collection.length;
        const picker = new ObjectPicker(editor);
        picker.mode.set(mode);
        picker.min = min;
        picker.max = min;
        return picker.execute().map(selected => {
            const added = mode2collection(mode, selected);
            return collection.concat(added);
        });
    }

}

function mode2collection(mode: SelectionMode, selected: HasSelection): SelectionArray {
    let collection;
    switch (mode) {
        case SelectionMode.CurveEdge: collection = selected.edges; break;
        case SelectionMode.Face: collection = selected.faces; break;
        case SelectionMode.Solid: collection = selected.solids; break;
        case SelectionMode.Curve: collection = selected.curves; break;
        case SelectionMode.ControlPoint: collection = selected.controlPoints; break;
    }
    return [...collection] as any;
}