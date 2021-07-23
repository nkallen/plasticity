import { CompositeDisposable, Disposable } from 'event-kit';
import * as THREE from "three";
import { Viewport } from '../components/viewport/Viewport';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { SelectionInteractionManager, SelectionMode } from '../selection/SelectionInteraction';
import { HasSelection, SelectionManager } from '../selection/SelectionManager';
import { AbstractViewportSelector } from '../selection/ViewportSelector';
import { Cancel, CancellablePromise } from '../util/Cancellable';
import * as visual from '../editor/VisualModel';

interface EditorLike {
    db: GeometryDatabase;
    viewports: Viewport[];
    signals: EditorSignals;
    materials: MaterialDatabase;
}

class MyViewportSelector extends AbstractViewportSelector {
    private interaction = new SelectionInteractionManager(this.selection, this.editor.materials, this.signals);
    objectSelected = this.signals.objectSelected;
    objectDeselected = this.signals.objectDeselected;

    constructor(
        camera: THREE.Camera,
        domElement: HTMLElement,
        private readonly editor: EditorLike,
        private readonly selection: SelectionManager
    ) {
        super(camera, domElement, editor.db, new EditorSignals());
        this.selection.mode.add(SelectionMode.Curve);
    }

    protected processIntersection(intersections: THREE.Intersection[]) {
        this.interaction.onClick(intersections);
    }
}

export class ObjectPicker {
    constructor(private readonly editor: EditorLike) { }

    execute(cb: (o: visual.Item | visual.TopologyItem | visual.ControlPoint) => void): CancellablePromise<HasSelection> {
        return new CancellablePromise((resolve, reject) => {
            const disposables = new CompositeDisposable();
            const editor = this.editor;
            const selection = new SelectionManager(this.editor.db, this.editor.materials, this.editor.signals, new Set());

            for (const viewport of this.editor.viewports) {
                viewport.disableControls();

                const camera = viewport.camera;
                const renderer = viewport.renderer;
                const domElement = renderer.domElement;
                const selector = new MyViewportSelector(camera, domElement, editor, selection);
                selector.objectSelected.add(item => {
                    cb(item);
                });
                disposables.add(new Disposable(() => selector.dispose()));
            }
            const cancel = () => {
                disposables.dispose();
                reject(Cancel);
            }
            const finish = () => {
                disposables.dispose();
                resolve(selection);
            }
            return { cancel, finish };
        });
    }

    allowCurveFragments() {
        
    }
}