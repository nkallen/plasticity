import MaterialDatabase from "../editor/MaterialDatabase";
import { EditorSignals } from "../editor/Editor";
import { Curve3D, CurveEdge, Face, Item, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../editor/VisualModel";
import { HighlightManager } from "./HighlightManager";
import { SelectionMode, SelectionStrategy } from "./SelectionInteraction";
import { HasSelection } from "./SelectionManager";

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

    curve3D(object: Curve3D, parentCurve: SpaceInstance<Curve3D>): boolean {
        if (this.selection.mode.has(SelectionMode.Curve) && !this.selection.selectedCurves.has(parentCurve)) {
            if (!this.selection.hover?.isEqual(parentCurve)) {
                this.selection.hover?.dispose();
                this.selection.hover = new Hoverable(parentCurve, this.materials, this.signals);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.selection.selectedSolids.has(parentItem) && !this.selection.hasSelectedChildren(parentItem)) {
            if (!this.selection.hover?.isEqual(parentItem)) {
                this.selection.hover?.dispose();
                this.selection.hover = new Hoverable(parentItem, this.materials, this.signals);
            }
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, _parentItem: Solid): boolean {
        if (this.selection.mode.has(SelectionMode.Face) && object instanceof Face && !this.selection.selectedFaces.has(object)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hover?.dispose();
                this.selection.hover = new Hoverable(object, this.materials, this.signals);
            }
            return true;
        } else if (this.selection.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selection.selectedEdges.has(object)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hover?.dispose();
                this.selection.hover = new Hoverable(object, this.materials, this.signals);
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
    constructor(
        private readonly object: Item | TopologyItem,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals
    ) {
        signals.objectHovered.dispatch(object);
    }

    dispose(): void {
        this.signals.objectUnhovered.dispatch(this.object);
    }

    isEqual(other: Item | TopologyItem): boolean {
        return this.object.userData.simpleName === other.userData.simpleName;
    }

    highlight(highlighter: HighlightManager) {
        if (this.object instanceof PlaneInstance || this.object instanceof SpaceInstance) {
            highlighter.highlightItems([this.object.userData.simpleName], o => this.materials.hover(o));
        } else if (this.object instanceof TopologyItem) {
            highlighter.highlightTopologyItems([this.object.userData.simpleName], o => this.materials.hover(o));
        }
    }

    unhighlight(highlighter: HighlightManager) {
        if (this.object instanceof PlaneInstance || this.object instanceof SpaceInstance) {
            highlighter.unhighlightItems([this.object.userData.simpleName]);
        } else if (this.object instanceof TopologyItem) {
            highlighter.unhighlightTopologyItems([this.object.userData.simpleName]);
        }
    }
}
