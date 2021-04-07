import { CompositeDisposable, Disposable } from "event-kit";
import { CurveSegment } from "../VisualModel";
import { Solid } from "../VisualModel";
import { CurveEdge } from "../VisualModel";
import { Curve3D } from "../VisualModel";
import { SpaceItem } from "../VisualModel";
import { Face } from "../VisualModel";
import { TopologyItem } from "../VisualModel";
import { SpaceInstance } from "../VisualModel";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { SelectionManager, SelectionMode, SelectionStrategy } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
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

    curve3D(object: CurveSegment, parentCurve: SpaceInstance<Curve3D>): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Curve) && !this.selectionManager.selectedCurves.has(parentCurve)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Curve3DHoverable(parentCurve, this.selectionManager.editor.materials.hover(), this.selectionManager.editor.signals.objectHovered);
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
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.editor.materials.hover(), this.selectionManager.editor.signals.objectHovered);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selectionManager.selectedEdges.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.editor.materials.hover(), this.selectionManager.editor.signals.objectHovered);
            }
            return true;
        }
        return false;
    }
}

export class Hoverable {
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
    protected readonly object: SpaceInstance<Curve3D>;

    constructor(object: SpaceInstance<Curve3D>, material: LineMaterial, signal: signals.Signal<SpaceItem>) {
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