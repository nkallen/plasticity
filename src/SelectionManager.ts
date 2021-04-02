
import { CompositeDisposable, Disposable } from 'event-kit';
import signals from 'signals';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { Editor } from './Editor';
import { Face, CurveEdge, TopologyItem, SpaceItem, Curve3D, CurveSegment, Solid, SpaceInstance } from './VisualModel';
import { RefCounter } from './Util';

enum SelectionMode {
    Edge, Face, Solid, Curve
}

class Hoverable {
    private readonly disposable = new CompositeDisposable();
    protected readonly object: SpaceItem;
    private readonly signal: signals.Signal<SpaceItem>;

    constructor(object: SpaceItem, signal: signals.Signal<SpaceItem>) {
        this.object = object;
        this.disposable.add(new Disposable(() => signal.dispatch(null)));
        signal.dispatch(object);
        this.signal = signal;
    }

    dispose() {
        this.signal.dispatch(this.object);
        this.disposable.dispose();
    }

    isEqual(other: SpaceItem) {
        return this.object == other;
    }
}

class TopologicalItemHoverable<T extends THREE.Material | THREE.Material[]> extends Hoverable {
    private readonly previousMaterial: T;
    protected readonly object: SpaceItem & { material: T };

    constructor(object: SpaceItem & { material: T }, material: T, signal: signals.Signal<SpaceItem>) {
        const previous = object.material;
        object.material = material;
        super(object, signal);
        this.previousMaterial = previous;
    }

    dispose() {
        this.object.material = this.previousMaterial;
        super.dispose();
    }
}

class Curve3DHoverable extends Hoverable {
    private readonly previousMaterial: LineMaterial;
    protected readonly object: SpaceInstance;

    constructor(object: SpaceInstance, material: LineMaterial, signal: signals.Signal<SpaceItem>) {
        let previous;
        for (const edge of object.underlying as Curve3D) {
            previous = edge.material;
            edge.material = material;
        }

        super(object, signal);
        this.previousMaterial = previous;
    }

    dispose() {
        for (const edge of this.object.underlying as Curve3D) {
            edge.material = this.previousMaterial;
        }
        super.dispose();
    }
}

interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: CurveSegment, parentItem: SpaceInstance): boolean;
    invalidIntersection(): void;
}

class ClickStrategy implements SelectionStrategy {
    constructor(private selectionManager: SelectionManager) {
    }

    emptyIntersection() {
        this.selectionManager.deselectAll();
    }

    invalidIntersection() { }

    curve3D(object: CurveSegment, parentItem: SpaceInstance) {
        const model = this.selectionManager.editor.lookupItem(parentItem);

        if (this.selectionManager.mode.has(SelectionMode.Curve)) {
            if (this.selectionManager.selectedCurves.has(parentItem)) {
                this.selectionManager.selectedCurves.delete(parentItem);
                object.material = this.selectionManager.editor.materialDatabase.line(model);
                this.selectionManager.editor.signals.objectDeselected.dispatch(parentItem);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedCurves.add(parentItem);
                object.material = this.selectionManager.editor.materialDatabase.highlight(model);
                this.selectionManager.editor.signals.objectSelected.dispatch(parentItem);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.selectedSolids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selectionManager.selectedSolids.delete(parentItem);
                this.selectionManager.editor.signals.objectDeselected.dispatch(parentItem);
            }
            return true;
        } else if (!this.selectionManager.selectedChildren.has(parentItem)) {
            this.selectionManager.hover?.dispose();
            this.selectionManager.hover = null;
            this.selectionManager.selectedSolids.add(parentItem);
            this.selectionManager.editor.signals.objectSelected.dispatch(parentItem);
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        const model = this.selectionManager.editor.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selectionManager.selectedFaces.has(object)) {
                this.selectionManager.selectedFaces.delete(object);
                object.material = this.selectionManager.editor.materialDatabase.lookup(model);
                this.selectionManager.selectedChildren.decr(parentItem);
                this.selectionManager.editor.signals.objectDeselected.dispatch(object);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedFaces.add(object);
                object.material = this.selectionManager.editor.materialDatabase.highlight(model);
                this.selectionManager.selectedChildren.incr(parentItem);
                this.selectionManager.editor.signals.objectSelected.dispatch(object);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge) {
            if (this.selectionManager.selectedEdges.has(object)) {
                this.selectionManager.selectedEdges.delete(object);
                object.material = this.selectionManager.editor.materialDatabase.lookup(model);
                this.selectionManager.selectedChildren.decr(parentItem);
                this.selectionManager.editor.signals.objectDeselected.dispatch(object);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedEdges.add(object);
                object.material = this.selectionManager.editor.materialDatabase.highlight(model);
                this.selectionManager.selectedChildren.incr(parentItem);
                this.selectionManager.editor.signals.objectSelected.dispatch(object);
            }
            return true;
        }
        return false;
    }
}

class HoverStrategy implements SelectionStrategy {
    constructor(private selectionManager: SelectionManager) {
    }

    emptyIntersection() {
        this.selectionManager.hover?.dispose();
        this.selectionManager.hover = null;
    }

    invalidIntersection() {
        this.selectionManager.hover?.dispose();
        this.selectionManager.hover = null;
    }

    curve3D(object: CurveSegment, parentCurve: SpaceInstance): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Curve) && !this.selectionManager.selectedCurves.has(parentCurve)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Curve3DHoverable(parentCurve, this.selectionManager.editor.materialDatabase.hover(), this.selectionManager.editor.signals.objectHovered);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.selectionManager.selectedSolids.has(parentItem) && !this.selectionManager.selectedChildren.has(parentItem)) {
            if (!this.selectionManager.hover?.isEqual(parentItem)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Hoverable(parentItem, this.selectionManager.editor.signals.objectHovered);
            }
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face && !this.selectionManager.selectedFaces.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.editor.materialDatabase.hover(), this.selectionManager.editor.signals.objectHovered);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selectionManager.selectedEdges.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.editor.materialDatabase.hover(), this.selectionManager.editor.signals.objectHovered);
            }
            return true;
        }
        return false;
    }
}

export class SelectionManager {
    readonly selectedSolids = new Set<Solid>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<SpaceInstance>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve]);
    hover?: Hoverable = null;

    private readonly clickStrategy = new ClickStrategy(this);
    private readonly hoverStrategy = new HoverStrategy(this);

    constructor(editor: Editor) {
        this.editor = editor;
    }

    private onIntersection(intersections: THREE.Intersection[], strategy: SelectionStrategy) {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.mode.has(SelectionMode.Solid)) {
                    if (strategy.solid(object, parentItem as Solid)) return;
                }
                if (strategy.topologicalItem(object, parentItem as Solid)) return;
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (strategy.curve3D(object, parentItem)) return;
            }
        }
    }

    onClick(intersections: THREE.Intersection[]) {
        this.onIntersection(intersections, this.clickStrategy);
    }

    onPointerMove(intersections: THREE.Intersection[]) {
        this.onIntersection(intersections, this.hoverStrategy);
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
        for (const object of this.selectedSolids) {
            this.selectedSolids.delete(object);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        this.selectedChildren.clear();
    }
}
