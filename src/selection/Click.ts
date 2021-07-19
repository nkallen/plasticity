import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../editor/VisualModel";
import { SelectionMode, SelectionStrategy } from "./SelectionInteraction";
import { ModifiesSelection } from "./SelectionManager";

export class ClickStrategy implements SelectionStrategy {
    constructor(private selection: ModifiesSelection) {}

    emptyIntersection(): void {
        this.selection.deselectAll();
    }

    curve3D(object: Curve3D, parentItem: SpaceInstance<Curve3D>): boolean {
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
        } else if (!this.selection.hasSelectedChildren(parentItem)) {
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

    region(object: Region, parentItem: PlaneInstance<Region>): boolean {
        if (this.selection.mode.has(SelectionMode.Face)) {
            if (this.selection.selectedRegions.has(parentItem)) {
                this.selection.deselectRegion(parentItem);
            } else {
                this.selection.selectRegion(parentItem);
            }
            return true;
        }
        return false;
    }

    controlPoint(object: ControlPoint, parentItem: Curve3D): boolean {
        if (this.selection.mode.has(SelectionMode.ControlPoint)) {
            if (this.selection.selectedControlPoints.has(object)) {
                this.selection.deselectControlPoint(object);
            } else {
                this.selection.selectControlPoint(object);
            }
            return true;
        }
        return false;
    }
}