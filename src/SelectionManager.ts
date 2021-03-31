
import { Editor } from './Editor';
import { Face, Item, CurveEdge, TopologyItem } from './VisualModel';

enum SelectionMode {
    Edge, Face, Item
}

class RefCounter {
    private readonly counts = new Map<Item, number>();

    has(item: Item): boolean {
        return this.counts.has(item);
    }

    incr(item: Item) {
        if (this.counts.has(item)) {
            const count = this.counts.get(item);
            this.counts.set(item, count + 1)
        } else {
            this.counts.set(item, 1);
        }
        const count = this.counts.get(item);
        console.log("incr", count, item);
    }

    decr(item: Item) {
        const count = this.counts.get(item);
        if (count == 1) {
            this.counts.delete(item);
            console.log("delete", item);
        } else {
            this.counts.set(item, count - 1)
            console.log("decr", count - 1, item);
        }
    }

    clear() {
        this.counts.clear();
    }
}

export class SelectionManager {
    readonly selectedItems = new Set<Item>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Item, SelectionMode.Edge]);

    constructor(editor: Editor) {
        this.editor = editor;
    }

    onIntersection(intersections: THREE.Intersection[]) {
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

    selectItem(object: TopologyItem, parentItem: Item): boolean {
        if (this.mode.has(SelectionMode.Item)) {
            if (this.selectedItems.has(parentItem)) {
                if (this.selectTopologicalItem(object, parentItem)) {
                    this.selectedItems.delete(parentItem);
                    this.editor.signals.objectDeselected.dispatch(parentItem);
                }
                return true;
            } else if (!this.selectedChildren.has(parentItem)) {
                this.selectedItems.add(parentItem);
                this.editor.signals.objectSelected.dispatch(parentItem);
                return true;
            }
        }
        return false;
    }

    selectTopologicalItem(object: TopologyItem, parentItem: Item): boolean {
        const model = this.editor.lookupTopologyItem(object);
        if (this.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selectedFaces.has(object)) {
                this.selectedFaces.delete(object);
                object.material = this.editor.materialDatabase.lookup(model);
                this.selectedChildren.decr(parentItem);
                this.editor.signals.objectDeselected.dispatch(object);
            } else {
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
                this.selectedEdges.add(object);
                object.material = this.editor.materialDatabase.highlight(model);
                this.selectedChildren.incr(parentItem);
                this.editor.signals.objectSelected.dispatch(object);
            }
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
