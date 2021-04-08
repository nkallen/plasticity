import { CompositeDisposable, Disposable } from "event-kit";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, SpaceItem, TopologyItem } from "../VisualModel";
import { SelectionManager, SelectionMode, SelectionStrategy } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
    constructor(private readonly selectionManager: SelectionManager) {
    }

    emptyIntersection() {
        this.selectionManager.hover?.dispose();
        this.selectionManager.hover = null;
    }

    invalidIntersection() {
        this.selectionManager.hover?.dispose();
        this.selectionManager.hover = null;
    }

    curve3D(object: CurveSegment, parentCurve: SpaceInstance<Curve3D>): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Curve) && !this.selectionManager.selectedCurves.has(parentCurve)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Curve3DHoverable(
                    parentCurve, this.selectionManager.materials.hover(object), this.selectionManager.signals.objectHovered);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.selectionManager.selectedSolids.has(parentItem) && !this.selectionManager.selectedChildren.has(parentItem)) {
            if (!this.selectionManager.hover?.isEqual(parentItem)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Hoverable(parentItem, this.selectionManager.signals.objectHovered);
            }
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face && !this.selectionManager.selectedFaces.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.materials.hover(object), this.selectionManager.signals.objectHovered);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selectionManager.selectedEdges.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.materials.hover(object), this.selectionManager.signals.objectHovered);
            }
            return true;
        }
        return false;
    }
}

export class Hoverable {
    private readonly disposable = new CompositeDisposable();
    protected readonly object: SpaceItem | TopologyItem;
    private readonly signal: signals.Signal<SpaceItem | TopologyItem>;

    constructor(object: SpaceItem | TopologyItem, signal: signals.Signal<SpaceItem | TopologyItem>) {
        this.object = object;
        this.disposable.add(new Disposable(() => signal.dispatch(null)));
        signal.dispatch(object);
        this.signal = signal;
    }

    dispose() {
        this.signal.dispatch(this.object);
        this.disposable.dispose();
    }

    isEqual(other: SpaceItem | TopologyItem) {
        return this.object == other;
    }
}

class TopologicalItemHoverable<T extends THREE.Material | THREE.Material[]> extends Hoverable {
    private readonly previousMaterial: T;
    protected readonly object: TopologyItem & { material: T };

    constructor(object: TopologyItem & { material: T }, material: T, signal: signals.Signal<SpaceItem | TopologyItem>) {
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
    protected readonly object: SpaceInstance<Curve3D>;

    constructor(object: SpaceInstance<Curve3D>, material: LineMaterial, signal: signals.Signal<SpaceItem | TopologyItem>) {
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