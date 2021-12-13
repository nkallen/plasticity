import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import { Intersectable, Intersection } from '../visual_model/Intersectable';
import LayerManager from '../editor/LayerManager';
import MaterialDatabase from '../editor/MaterialDatabase';
import { ChangeSelectionExecutor, ChangeSelectionModifier, SelectionMode } from '../selection/ChangeSelectionExecutor';
import { HasSelection, Selectable, SelectionDatabase, ToggleableSet } from '../selection/SelectionDatabase';
import { AbstractViewportSelector } from '../selection/ViewportSelector';
import { CancellablePromise } from '../util/Cancellable';

interface EditorLike {
    db: DatabaseLike;
    viewports: Viewport[];
    signals: EditorSignals;
    materials: MaterialDatabase;
    changeSelection: ChangeSelectionExecutor;
    layers: LayerManager;
    keymaps: AtomKeymap.KeymapManager;
}

export class ObjectPickerViewportSelector extends AbstractViewportSelector {
    private changeSelection = new ChangeSelectionExecutor(this.selection, this.editor.materials, this.editor.signals);

    constructor(
        viewport: Viewport,
        private readonly editor: EditorLike,
        private readonly selection: SelectionDatabase,
        private readonly onEmptyIntersection = () => { },
        raycasterParams: THREE.RaycasterParameters,
    ) {
        super(viewport, editor.layers, editor.db, editor.keymaps, editor.signals, raycasterParams);
        this.selection.mode.add(SelectionMode.Curve); // FIXME: obviously not desirable
    }

    // Normally a viewport selector enqueues a ChangeSelectionCommand; however,
    // This class is used in commands temporarily modify the selection
    processClick(intersections: Intersection[], upEvent: MouseEvent) {
        this.changeSelection.onClick(intersections, ChangeSelectionModifier.Replace);
        if (intersections.length === 0) this.onEmptyIntersection();
    }

    processBoxSelect(selected: Set<Intersectable>, upEvent: MouseEvent): void {
        this.changeSelection.onBoxSelect(selected, ChangeSelectionModifier.Replace);
        if (selected.size === 0) this.onEmptyIntersection();
    }

    // That said, hover works as normal
    processHover(intersects: Intersection[], moveEvent: MouseEvent) {
        this.editor.changeSelection.onHover(intersects, ChangeSelectionModifier.Replace);
    }

    processBoxHover(selected: Set<Intersectable>, moveEvent: MouseEvent): void {
        this.editor.changeSelection.onBoxHover(selected, ChangeSelectionModifier.Replace);
    }
}

export class ObjectPicker {
    private readonly mode = new ToggleableSet([], this.editor.signals);
    readonly raycasterParams: THREE.RaycasterParameters & { Line2: { threshold: number } } = {
        Mesh: { threshold: 0 },
        Line: { threshold: 0.1 },
        Line2: { threshold: 15 },
        Points: { threshold: 10 }
    };

    constructor(private readonly editor: EditorLike) { }

    execute(cb?: (o: Selectable) => void): CancellablePromise<HasSelection> {
        const signals = new EditorSignals();
        const cancellable = new CancellablePromise<HasSelection>((resolve, reject) => {
            const editor = this.editor;

            const disposables = new CompositeDisposable();

            editor.signals.objectRemoved.add(signals.objectRemoved.dispatch);
            disposables.add(new Disposable(() => editor.signals.objectRemoved.remove(signals.objectRemoved.dispatch)));

            const selection = new SelectionDatabase(editor.db, editor.materials, signals, this.mode);

            if (cb !== undefined) {
                signals.objectSelected.add(cb);
                disposables.add(new Disposable(() => signals.objectSelected.remove(cb)));
            }
            const finish = () => cancellable.finish();
            signals.objectSelected.add(finish);
            disposables.add(new Disposable(() => signals.objectSelected.remove(finish)));

            for (const viewport of this.editor.viewports) {
                viewport.disableControls(viewport.navigationControls);
                disposables.add(new Disposable(() => viewport.enableControls()));

                const selector = new ObjectPickerViewportSelector(viewport, editor, selection, finish, this.raycasterParams);
                selector.addEventLiseners();

                disposables.add(new Disposable(() => selector.dispose()));
            }

            return { dispose: () => disposables.dispose(), finish: () => resolve(selection.selected) };
        });
        return cancellable;
    }

    allowCurves() {
        this.mode.add(SelectionMode.Curve);
    }
}