import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import { Intersectable } from '../editor/Intersectable';
import MaterialDatabase from '../editor/MaterialDatabase';
import { SelectionInteractionManager, SelectionMode } from '../selection/SelectionInteraction';
import { HasSelection, Selectable, SelectionManager, ToggleableSet } from '../selection/SelectionManager';
import { AbstractViewportSelector } from '../selection/ViewportSelector';
import { CancellablePromise } from '../util/Cancellable';

interface EditorLike {
    db: DatabaseLike;
    viewports: Viewport[];
    signals: EditorSignals;
    materials: MaterialDatabase;
    selectionInteraction: SelectionInteractionManager;
}

class MyViewportSelector extends AbstractViewportSelector {
    private interaction = new SelectionInteractionManager(this.selection, this.editor.materials, this.editor.signals);

    constructor(
        viewport: Viewport,
        private readonly editor: EditorLike,
        private readonly selection: SelectionManager,
        private readonly onEmptyIntersection = () => { },
        raycasterParams: THREE.RaycasterParameters,
    ) {
        super(viewport, editor.db, editor.signals, raycasterParams);
        this.selection.mode.add(SelectionMode.Curve);
    }

    // Normally a viewport selector enqueues a ChangeSelectionCommand; however,
    // This class is used in commands temporarily modify the selection
    protected processClick(intersections: Intersectable[]) {
        this.interaction.onClick(intersections);
        if (intersections.length === 0) this.onEmptyIntersection();
    }

    protected processHover(intersects: Intersectable[]) {
        this.editor.selectionInteraction.onHover(intersects);
    }

    protected processBoxHover(selected: Set<Intersectable>): void {
        this.editor.selectionInteraction.onBoxHover(selected);
    }

    protected processBoxSelect(selected: Set<Intersectable>): void {
        this.interaction.onBoxSelect(selected);
        if (selected.size === 0) this.onEmptyIntersection();
    }
}

export class ObjectPicker {
    private readonly mode = new ToggleableSet<SelectionMode>([], this.editor.signals);
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

            const selection = new SelectionManager(editor.db, editor.materials, signals, this.mode);

            if (cb !== undefined) {
                signals.objectSelected.add(cb);
                disposables.add(new Disposable(() => signals.objectSelected.remove(cb)));
            }
            const finish = () => cancellable.finish();
            signals.objectSelected.add(finish);
            disposables.add(new Disposable(() => signals.objectSelected.remove(finish)));

            for (const viewport of this.editor.viewports) {
                viewport.selector.enabled = false;
                disposables.add(new Disposable(() => viewport.enableControls()));

                const selector = new MyViewportSelector(viewport, editor, selection, finish, this.raycasterParams);

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