import MaterialDatabase from "../MaterialDatabase";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";
import { EditorSignals } from "../Editor";
import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, SpaceItem, TopologyItem } from "../VisualModel";
import { SelectionMode, SelectionStrategy, UndoableSelectionManager } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
    constructor(
        private readonly selection: UndoableSelectionManager,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals,
        ) {}

    emptyIntersection(): void {
        this.selection.hover?.dispose();
        this.selection.hover = undefined;
    }

    invalidIntersection(): void {
        this.selection.hover?.dispose();
        this.selection.hover = undefined;
    }

    curve3D(object: CurveSegment, parentCurve: SpaceInstance<Curve3D>): boolean {
        if (this.selection.mode.has(SelectionMode.Curve) && !this.selection.selectedCurves.has(parentCurve)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hover?.dispose();
                this.selection.hover = new Curve3DHoverable(
                    parentCurve, this.materials.hover(object), this.signals);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.selection.selectedSolids.has(parentItem) && !this.selection.selectedChildren.has(parentItem)) {
            if (!this.selection.hover?.isEqual(parentItem)) {
                this.selection.hover?.dispose();
                this.selection.hover = new Hoverable(parentItem, this.signals);
            }
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, _parentItem: Solid): boolean {
        if (this.selection.mode.has(SelectionMode.Face) && object instanceof Face && !this.selection.selectedFaces.has(object)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hover?.dispose();
                this.selection.hover = new TopologicalItemHoverable(object, this.materials.hover(object), this.signals);
            }
            return true;
        } else if (this.selection.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selection.selectedEdges.has(object)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hover?.dispose();
                this.selection.hover = new TopologicalItemHoverable(object, this.materials.hover(object), this.signals);
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
        this.signals = signals;
        signals.objectHovered.dispatch(object);
    }

    dispose(): void {
        this.signals.objectUnhovered.dispatch(this.object);
    }

    isEqual(other: SpaceItem | TopologyItem): boolean {
        return this.object === other;
    }

    highlight() {}
    unhighlight() {}
}

class TopologicalItemHoverable<T extends THREE.Material | THREE.Material[]> extends Hoverable {
    protected readonly object: TopologyItem & { material: T };
    private readonly material: T

    constructor(object: TopologyItem & { material: T }, material: T, signals: EditorSignals) {
        super(object, signals);
        this.object = object;
        this.material = material;
    }

    private previousMaterial: any;
    highlight() {
        this.previousMaterial = this.object.material;
        this.object.material = this.material;
    }

    unhighlight() {
        this.object.material = this.previousMaterial!;
    }
}

class Curve3DHoverable extends Hoverable {
    protected readonly object: SpaceInstance<Curve3D>;
    private readonly material: LineMaterial;

    constructor(object: SpaceInstance<Curve3D>, material: LineMaterial, signals: EditorSignals) {
        object.material = material;

        super(object, signals);
        this.object = object;
        this.material = material;
    }

    private previousMaterial: any;
    highlight() {
        this.previousMaterial = this.object.material;
        this.object.material = this.material;
        super.dispose();
    }

    unhighlight() {
        this.object.material = this.previousMaterial!;
    }
}