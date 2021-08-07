import MaterialDatabase from "../editor/MaterialDatabase";
import { EditorSignals } from "../editor/EditorSignals";
import { ControlPoint, Curve3D, CurveEdge, Face, Item, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../editor/VisualModel";
import { HighlightManager } from "./HighlightManager";
import { SelectionMode, SelectionStrategy } from "./SelectionInteraction";
import { HasSelection, ModifiesSelection } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
    constructor(
        private readonly selection: ModifiesSelection,
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
                this.selection.hoverFace(object, _parentItem);
            }
            return true;
        } else if (this.selection.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selection.selectedEdges.has(object)) {
            if (!this.selection.hover?.isEqual(object)) {
                this.selection.hoverEdge(object, _parentItem);
            }
            return true;
        }
        return false;
    }

    region(object: Region, parentItem: PlaneInstance<Region>): boolean {
        if (this.selection.mode.has(SelectionMode.Face)) {
            if (this.selection.selectedRegions.has(parentItem)) { }
            this.selection.hover?.dispose();
            // FIXME regions aren't actually hover/highlighting
            this.selection.hover = new Hoverable(object, this.materials, this.signals);
            return true;
        }
        return false;
    }

    controlPoint(object: ControlPoint, parentItem: SpaceInstance<Curve3D>): boolean {
        if (!this.selection.mode.has(SelectionMode.ControlPoint)) return false;
        if (!this.selection.selectedCurves.has(parentItem) && !this.selection.hasSelectedChildren(parentItem)) return false;

        if (!this.selection.selectedControlPoints.has(object)) {
            this.selection.hover?.dispose();
            this.selection.hover = new Hoverable(object, this.materials, this.signals);
            return true;
        }
        return false;
    }
}

export class Hoverable {
    constructor(
        private readonly object: Item | TopologyItem | ControlPoint | Region,
        private readonly materials: MaterialDatabase,
        private readonly signals: EditorSignals
    ) {
        signals.objectHovered.dispatch(object);
    }

    dispose(): void {
        this.signals.objectUnhovered.dispatch(this.object);
    }

    isEqual(other: Item | TopologyItem | ControlPoint): boolean {
        return this.object.simpleName === other.simpleName;
    }

    highlight(highlighter: HighlightManager) {
        const { object, materials } = this;
        if (object instanceof PlaneInstance || object instanceof SpaceInstance) {
            highlighter.highlightItems([object.simpleName], o => materials.hover(o));
        } else if (object instanceof TopologyItem) {
            highlighter.highlightTopologyItems([object.simpleName], o => materials.hover(o));
        } else if (object instanceof ControlPoint) { 
            highlighter.highlightControlPoints([object.simpleName], o => materials.hover(o));
        }
    }

    unhighlight(highlighter: HighlightManager) {
        const { object } = this;
        if (object instanceof PlaneInstance || object instanceof SpaceInstance) {
            highlighter.unhighlightItems([object.simpleName]);
        } else if (object instanceof TopologyItem) {
            highlighter.unhighlightTopologyItems([object.simpleName]);
        } else if (object instanceof ControlPoint) {
            highlighter.unhighlightControlPoints([object.simpleName])
        }
    }
}
