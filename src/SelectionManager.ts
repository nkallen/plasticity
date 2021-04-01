
import { CompositeDisposable, Disposable } from 'event-kit';
import signals from 'signals';
import { LineBasicMaterial } from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { Editor } from './Editor';
import { Face, Item, CurveEdge, TopologyItem, VisualModel, Curve3D, Edge, CurveSegment } from './VisualModel';

enum SelectionMode {
    Edge, Face, Item, Curve
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
    protected readonly object: VisualModel;

    constructor(object: VisualModel, signal: signals.Signal<VisualModel>) {
        this.object = object;
        this.disposable.add(new Disposable(() => signal.dispatch(null)));
        signal.dispatch(object);
    }

    dispose() {
        this.disposable.dispose();
    }

    isEqual(other: VisualModel) {
        return this.object == other;
    }
}

class TopologicalItemHoverable<T extends THREE.Material | THREE.Material[]> extends Hoverable {
    private readonly previousMaterial: T;
    protected readonly object: VisualModel & { material: T };

    constructor(object: VisualModel & { material: T }, material: T, signal: signals.Signal<VisualModel>) {
        const previous = object.material;
        object.material = material;
        super(object, signal);
        this.previousMaterial = previous;
    }

    dipose() {
        this.object.material = this.previousMaterial;
        super.dispose();
    }
}

class Curve3DHoverable extends Hoverable {
    private readonly previousMaterial: LineMaterial;
    protected readonly object: Curve3D;

    constructor(object: Curve3D, material: LineMaterial, signal: signals.Signal<VisualModel>) {
        let previous;
        for (const edge of object) {
            previous = edge.material;
            edge.material = material;
        }

        super(object, signal);
        this.previousMaterial = previous;
    }

    dispose() {
        for (const edge of this.object) {
            edge.material = this.previousMaterial;
        }
        super.dispose();
    }
}

export class SelectionManager {
    readonly selectedItems = new Set<Item>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<Curve3D>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Item, SelectionMode.Edge, SelectionMode.Curve]);
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
            const object = intersection.object;

            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.hoverItem(parentItem)) {
                    if (!this.hover?.isEqual(parentItem)) {
                        this.hover?.dispose();
                        this.hover = new Hoverable(parentItem, this.editor.signals.objectHovered);
                    }
                    return;
                } else if (this.hoverTopologicalItem(object, parentItem)) {
                    if (!this.hover?.isEqual(object)) {
                        this.hover?.dispose();
                        this.hover = new TopologicalItemHoverable(object, this.editor.materialDatabase.hover(), this.editor.signals.objectHovered);
                    }
                    return;
                }
            } else if (object instanceof CurveSegment) {
                const parentCurve = object.parentCurve;
                if (this.hoverCurve3D(object, parentCurve)) {
                    if (!this.hover?.isEqual(object)) {
                        this.hover?.dispose();
                        this.hover = new Curve3DHoverable(parentCurve, this.editor.materialDatabase.hover(), this.editor.signals.objectHovered);
                    }
                    return;
                }
            }
        }
        this.hover?.dispose();
        this.hover = null;
    }

    private hoverCurve3D(object: CurveSegment, parentCurve: Curve3D): boolean {
        if (this.mode.has(SelectionMode.Curve) && !this.selectedCurves.has(parentCurve)) {
            return true;
        }
        return false;
    }

    private hoverItem(parentItem: Item): boolean {
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
