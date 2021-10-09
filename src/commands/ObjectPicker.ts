import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { Intersectable, Intersection } from '../editor/Intersectable';
import { SelectionInteractionManager, SelectionMode } from '../selection/SelectionInteraction';
import { HasSelection, Selectable, SelectionManager } from '../selection/SelectionManager';
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
    private interaction = new SelectionInteractionManager(this.selection, this.editor.materials, this.signals);

    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        private readonly editor: EditorLike,
        private readonly selection: SelectionManager,
        private readonly onEmptyIntersection = () => { }
    ) {
        super(camera, domElement, editor.db, editor.signals);
        this.selection.mode.add(SelectionMode.Curve);
    }

    // Normally a viewport selector enqueues a ChangeSelectionCommand; however,
    // This class is used in commands temporarily modify the selection
    protected processClick(intersections: Intersection[]) {
        this.interaction.onClick(intersections);
        if (intersections.length === 0) this.onEmptyIntersection();
    }

    protected processHover(intersects: Intersection[]) {
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
    constructor(private readonly editor: EditorLike) { }

    execute(cb?: (o: Selectable) => void): CancellablePromise<HasSelection> {
        const signals = new EditorSignals();
        const cancellable = new CancellablePromise<HasSelection>((resolve, reject) => {
            const editor = this.editor;

            const disposables = new CompositeDisposable();

            editor.signals.objectRemoved.add(signals.objectRemoved.dispatch);
            disposables.add(new Disposable(() => editor.signals.objectRemoved.remove(signals.objectRemoved.dispatch)));

            const selection = new SelectionManager(editor.db, editor.materials, signals, new Set());

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

                const selector = new MyViewportSelector(viewport.camera, viewport.renderer.domElement, editor, selection, finish);

                disposables.add(new Disposable(() => selector.dispose()));
            }

            return { dispose: () => disposables.dispose(), finish: () => resolve(selection.selected) };
        });
        return cancellable;
    }

    allowCurveFragments() {

    }
}