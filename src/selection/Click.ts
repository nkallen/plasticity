import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, TopologyItem } from "../VisualModel";
import { SelectionManager, SelectionMode, SelectionStrategy } from "./SelectionManager";

export class ClickStrategy implements SelectionStrategy {
    constructor(private selectionManager: SelectionManager) {
    }

    emptyIntersection(): void {
        this.selectionManager.deselectAll();
    }

    invalidIntersection(): void { }

    curve3D(object: CurveSegment, parentItem: SpaceInstance<Curve3D>): boolean {
        const model = this.selectionManager.db.lookup(parentItem);

        if (this.selectionManager.mode.has(SelectionMode.Curve)) {
            if (this.selectionManager.selectedCurves.has(parentItem)) {
                this.selectionManager.deselectCurve(parentItem);
            } else {
                this.selectionManager.selectCurve(parentItem);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.selectedSolids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selectionManager.deselectSolid(parentItem);
                return true;
            }
            return false;
        } else if (!this.selectionManager.selectedChildren.has(parentItem)) {
            this.selectionManager.selectSolid(parentItem);
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selectionManager.selectedFaces.has(object)) {
                this.selectionManager.deselectFace(object, parentItem);
            } else {
                this.selectionManager.selectFace(object, parentItem);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge) {
            if (this.selectionManager.selectedEdges.has(object)) {
                this.selectionManager.deselectEdge(object, parentItem);
            } else {
                this.selectionManager.selectEdge(object, parentItem);
            }
            return true;
        }
        return false;
    }
}