
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

    constructor(object: SpaceItem, signal: signals.Signal<SpaceItem>) {
        this.object = object;
        this.disposable.add(new Disposable(() => signal.dispatch(null)));
        signal.dispatch(object);
    }

    dispose() {
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

    dipose() {
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

export class SelectionManager {
    readonly selectedSolids = new Set<Solid>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<SpaceInstance>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve]);
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
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;

                if (this.selectSolid(object, parentItem as Solid)) break;
                if (this.selectTopologicalItem(object, parentItem as Solid)) break;
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (this.selectCurve3D(object, parentItem)) break;
            }
        }
    }

    private selectCurve3D(object: CurveSegment, parentItem: SpaceInstance) {
        const model = this.editor.lookupItem(parentItem);

        if (this.mode.has(SelectionMode.Curve)) {
            if (this.selectedCurves.has(parentItem)) {
                this.selectedCurves.delete(parentItem);
                object.material = this.editor.materialDatabase.line(model);
                this.editor.signals.objectDeselected.dispatch(parentItem);
            } else {
                this.hover?.dispose();
                this.hover = null;
                this.selectedCurves.add(parentItem);
                object.material = this.editor.materialDatabase.highlight(model);
                this.editor.signals.objectSelected.dispatch(parentItem);
            }
            return true;
        }
        return false;
    }

    private selectSolid(object: TopologyItem, parentItem: Solid): boolean {
        if (this.mode.has(SelectionMode.Solid)) {
            if (this.selectedSolids.has(parentItem)) {
                if (this.selectTopologicalItem(object, parentItem)) {
                    this.selectedSolids.delete(parentItem);
                    this.editor.signals.objectDeselected.dispatch(parentItem);
                }
                return true;
            } else if (!this.selectedChildren.has(parentItem)) {
                this.hover?.dispose();
                this.hover = null;
                this.selectedSolids.add(parentItem);
                this.editor.signals.objectSelected.dispatch(parentItem);
                return true;
            }
        }
        return false;
    }

    private selectTopologicalItem(object: TopologyItem, parentItem: Solid): boolean {
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
                if (this.hoverItem(parentItem as Solid)) {
                    if (!this.hover?.isEqual(parentItem)) {
                        this.hover?.dispose();
                        this.hover = new Hoverable(parentItem, this.editor.signals.objectHovered);
                    }
                    return;
                } else if (this.hoverTopologicalItem(object, parentItem as Solid)) {
                    if (!this.hover?.isEqual(object)) {
                        this.hover?.dispose();
                        this.hover = new TopologicalItemHoverable(object, this.editor.materialDatabase.hover(), this.editor.signals.objectHovered);
                    }
                    return;
                }
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (this.hoverCurve3D(object, parentItem)) {
                    if (!this.hover?.isEqual(object)) {
                        this.hover?.dispose();
                        this.hover = new Curve3DHoverable(parentItem, this.editor.materialDatabase.hover(), this.editor.signals.objectHovered);
                    }
                    return;
                }
            }
        }
        this.hover?.dispose();
        this.hover = null;
    }

    private hoverCurve3D(object: CurveSegment, parentCurve: SpaceInstance): boolean {
        if (this.mode.has(SelectionMode.Curve) && !this.selectedCurves.has(parentCurve)) {
            return true;
        }
        return false;
    }

    private hoverItem(parentItem: Solid): boolean {
        if (this.mode.has(SelectionMode.Solid)) {
            if (!this.selectedSolids.has(parentItem) && !this.selectedChildren.has(parentItem)) {
                return true;
            }
        }
        return false;
    }

    private hoverTopologicalItem(object: TopologyItem, parentItem: Solid): boolean {
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
        for (const object of this.selectedSolids) {
            this.selectedSolids.delete(object);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        this.selectedChildren.clear();
    }
}
