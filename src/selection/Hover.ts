import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { EditorSignals } from "../Editor";
import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, SpaceItem, TopologyItem } from "../VisualModel";
import { SelectionManager, SelectionMode, SelectionStrategy } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
    constructor(private readonly selectionManager: SelectionManager) {
    }

    emptyIntersection(): void {
        this.selectionManager.hover?.dispose();
        this.selectionManager.hover = undefined;
    }

    invalidIntersection(): void {
        this.selectionManager.hover?.dispose();
        this.selectionManager.hover = undefined;
    }

    curve3D(object: CurveSegment, parentCurve: SpaceInstance<Curve3D>): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Curve) && !this.selectionManager.selectedCurves.has(parentCurve)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Curve3DHoverable(
                    parentCurve, this.selectionManager.materials.hover(object), this.selectionManager.signals);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.selectionManager.selectedSolids.has(parentItem) && !this.selectionManager.selectedChildren.has(parentItem)) {
            if (!this.selectionManager.hover?.isEqual(parentItem)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new Hoverable(parentItem, this.selectionManager.signals);
            }
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, _parentItem: Solid): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face && !this.selectionManager.selectedFaces.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.materials.hover(object), this.selectionManager.signals);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selectionManager.selectedEdges.has(object)) {
            if (!this.selectionManager.hover?.isEqual(object)) {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = new TopologicalItemHoverable(object, this.selectionManager.materials.hover(object), this.selectionManager.signals);
            }
            return true;
        }
        return false;
    }
}

export class Hoverable {
    protected readonly object: SpaceItem | TopologyItem;
    private readonly signals: EditorSignals;

    constructor(object: SpaceItem | TopologyItem, signals: EditorSignals) {
        this.object = object;
        signals.objectHovered.dispatch(object);
        this.signals = signals;
    }

    dispose(): void {
        this.signals.objectUnhovered.dispatch(this.object);
    }

    isEqual(other: SpaceItem | TopologyItem): boolean {
        return this.object === other;
    }
}

class TopologicalItemHoverable<T extends THREE.Material | THREE.Material[]> extends Hoverable {
    private readonly previousMaterial: T;
    protected readonly object: TopologyItem & { material: T };

    constructor(object: TopologyItem & { material: T }, material: T, signals: EditorSignals) {
        const previous = object.material;
        object.material = material;
        super(object, signals);
        this.object = object;
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

    constructor(object: SpaceInstance<Curve3D>, material: LineMaterial, signals: EditorSignals) {
        const previous = object.material;
        object.material = material;

        super(object, signals);
        this.object = object;
        this.previousMaterial = previous;
    }

    dispose() {
        this.object.material = this.previousMaterial;
        super.dispose();
    }
}