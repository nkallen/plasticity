import { EditorSignals } from "../Editor";
import MaterialDatabase from "../MaterialDatabase";
import { Curve3D, CurveEdge, CurveSegment, Face, PlaneInstance, Region, Solid, SpaceInstance, SpaceItem, TopologyItem } from "../VisualModel";
import { HasSelection, SelectionMode, SelectionStrategy } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
    constructor(
        private readonly selection: HasSelection,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals,
    ) { }

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
                this.selection.hover = new MaterialHoverable(
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
                this.selection.hover = new MaterialHoverable(object, this.materials.hover(object), this.signals);
            }
            return true;
        } else if (this.selection.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selection.selectedEdges.has(object)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hover?.dispose();
                this.selection.hover = new MaterialHoverable(object, this.materials.hover(object), this.signals);
            }
            return true;
        }
        return false;
    }

    region(object: Region, parentItem: PlaneInstance<Region>): boolean {
        if (this.selection.mode.has(SelectionMode.Face)) {
            if (this.selection.selectedRegions.has(parentItem)) { }
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

    highlight() { }
    unhighlight() { }
}

class MaterialHoverable<T extends (SpaceItem | TopologyItem) & { material: THREE.Material }> extends Hoverable {
    protected readonly object: T;
    private readonly material: THREE.Material

    constructor(object: T, material: THREE.Material, signals: EditorSignals) {
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