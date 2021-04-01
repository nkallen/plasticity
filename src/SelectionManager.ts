
import { CompositeDisposable, Disposable } from 'event-kit';
import signals from 'signals';
import { Editor, EditorSignals } from './Editor_';
import { Face, Item, CurveEdge, TopologyItem, VisualModel } from './VisualModel';

enum SelectionMode {
    Edge, Face, Item
}

class RefCounter<T> {
    private readonly counts = new Map<T, number>();

    has(item: T): boolean {
        return this.counts.has(item);
    }

    incr(item: T) {
        if (this.counts.has(item)) {
            const count = this.counts.get(item);
            this.counts.set(item, count + 1)
        } else {
            this.counts.set(item, 1);
        }
    }

    decr(item: T) {
        const count = this.counts.get(item);
        if (count == 1) {
            this.counts.delete(item);
        } else {
            this.counts.set(item, count - 1)
        }
    }

    clear() {
        this.counts.clear();
    }
}

class Hoverable {
    private readonly disposable = new CompositeDisposable();
    private readonly object: Item | TopologyItem;
    private readonly previousMaterial?: THREE.Material | THREE.Material[];

    constructor(object: Item | TopologyItem, material: THREE.Material, signal: signals.Signal<VisualModel>) {
        this.object = object;
        this.disposable.add(new Disposable(() => signal.dispatch(null)));
        if (!(object instanceof Item)) {
            this.previousMaterial = object.material;
            object.material = material;
        }
        signal.dispatch(object);
    }

    dispose() {
        if (!(this.object instanceof Item)) {
            this.object.material = this.previousMaterial;
        }
        this.disposable.dispose();
    }

    equals(other: Item | TopologyItem) {
        return this.object == other;
    }
}

export class SelectionManager {
    readonly selectedItems = new Set<Item>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Item, SelectionMode.Edge]);
    hover?: Hoverable = null;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    onClick(intersections: THREE.Intersection[]) {
        if (intersections.length == 0) {
            this.deselectAll();
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object as TopologyItem;
            const parentItem = object.parentItem;

            if (this.selectItem(object, parentItem)) break;
            if (this.selectTopologicalItem(object, parentItem)) break;
        }
    }

    private selectItem(object: TopologyItem, parentItem: Item): boolean {
        if (this.mode.has(SelectionMode.Item)) {
            if (this.selectedItems.has(parentItem)) {
                if (this.selectTopologicalItem(object, parentItem)) {
                    this.selectedItems.delete(parentItem);
                    this.editor.signals.objectDeselected.dispatch(parentItem);
                }
                return true;
            } else if (!this.selectedChildren.has(parentItem)) {
                this.hover?.dispose();
                this.hover = null;
                this.selectedItems.add(parentItem);
                this.editor.signals.objectSelected.dispatch(parentItem);
                return true;
            }
        }
        return false;
    }

    private selectTopologicalItem(object: TopologyItem, parentItem: Item): boolean {
        const model = this.editor.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        if (this.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selectedFaces.has(object)) {
                this.selectedFaces.delete(object);
                object.material = this.editor.materialDatabase.lookup(model);
                this.selectedChildren.decr(parentItem);
                this.editor.signals.objectDeselected.dispatch(object);
            } else {
                this.hover?.dispose();
                this.hover = null;
                this.selectedFaces.add(object);
                object.material = this.editor.materialDatabase.highlight(model);
                this.selectedChildren.incr(parentItem);
                this.editor.signals.objectSelected.dispatch(object);
            }
            return true;
        } else if (this.mode.has(SelectionMode.Edge) && object instanceof CurveEdge) {
            if (this.selectedEdges.has(object)) {
                this.selectedEdges.delete(object);
                object.material = this.editor.materialDatabase.lookup(model);
                this.selectedChildren.decr(parentItem);
                this.editor.signals.objectDeselected.dispatch(object);
            } else {
                this.hover?.dispose();
                this.hover = null;
                this.selectedEdges.add(object);
                object.material = this.editor.materialDatabase.highlight(model);
                this.selectedChildren.incr(parentItem);
                this.editor.signals.objectSelected.dispatch(object);
            }
            return true;
        }
        return false;
    }

    onPointerMove(intersections: THREE.Intersection[]) {
        if (intersections.length == 0) {
            this.hover?.dispose();
            this.hover = null;
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object as TopologyItem;
            const parentItem = object.parentItem;
            const model = this.editor.lookupTopologyItem(object);

            if (this.hoverItem(object, parentItem)) {
                if (!this.hover?.equals(parentItem)) {
                    this.hover?.dispose();
                    this.hover = new Hoverable(parentItem, this.editor.materialDatabase.hover(), this.editor.signals.objectHovered);
                }
                return;
            } else if (this.hoverTopologicalItem(object, parentItem)) {
                if (!this.hover?.equals(object)) {
                    this.hover?.dispose();
                    this.hover = new Hoverable(object, this.editor.materialDatabase.hover(), this.editor.signals.objectHovered);
                }
                return;
            }
        }
        this.hover?.dispose();
        this.hover = null;
    }

    private hoverItem(object: TopologyItem, parentItem: Item): boolean {
        if (this.mode.has(SelectionMode.Item)) {
            if (!this.selectedItems.has(parentItem) && !this.selectedChildren.has(parentItem)) {
                return true;
            }
        }
        return false;
    }

    private hoverTopologicalItem(object: TopologyItem, parentItem: Item): boolean {
        if (this.mode.has(SelectionMode.Face) && object instanceof Face && !this.selectedFaces.has(object)) {
            return true;
        } else if (this.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selectedEdges.has(object)) {
            return true;
        }
        return false;
    }

    deselectAll() {
        for (const object of this.selectedEdges) {
            this.selectedEdges.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedFaces) {
            this.selectedFaces.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedItems) {
            this.selectedItems.delete(object);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        this.selectedChildren.clear();
    }
}
