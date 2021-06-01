import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, TopologyItem } from "../VisualModel";
import { SelectionMode, SelectionStrategy, UndoableSelectionManager } from "./SelectionManager";

export class ClickStrategy implements SelectionStrategy {
    constructor(private selection: UndoableSelectionManager) {
    }

    emptyIntersection(): void {
        this.selection.deselectAll();
    }

    invalidIntersection(): void { }

    curve3D(object: CurveSegment, parentItem: SpaceInstance<Curve3D>): boolean {
        if (this.selection.mode.has(SelectionMode.Curve)) {
            if (this.selection.selectedCurves.has(parentItem)) {
                this.selection.deselectCurve(parentItem);
            } else {
                this.selection.selectCurve(parentItem);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selection.selectedSolids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selection.deselectSolid(parentItem);
                return true;
            }
            return false;
        } else if (!this.selection.selectedChildren.has(parentItem)) {
            this.selection.selectSolid(parentItem);
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selection.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selection.selectedFaces.has(object)) {
                this.selection.deselectFace(object, parentItem);
            } else {
                this.selection.selectFace(object, parentItem);
            }
            return true;
        } else if (this.selection.mode.has(SelectionMode.Edge) && object instanceof CurveEdge) {
            if (this.selection.selectedEdges.has(object)) {
                this.selection.deselectEdge(object, parentItem);
            } else {
                this.selection.selectEdge(object, parentItem);
            }
            return true;
        }
        return false;
    }
}