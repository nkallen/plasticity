import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../editor/VisualModel";
import { SelectionMode, SelectionStrategy } from "./SelectionInteraction";
import { ModifiesSelection } from "./SelectionManager";

export class HoverStrategy implements SelectionStrategy {
    constructor(
        private selected: ModifiesSelection,
        private hovered: ModifiesSelection
    ) { }

    emptyIntersection(): void {
        this.hovered.removeAll();
    }

    curve3D(object: Curve3D, parentItem: SpaceInstance<Curve3D>): boolean {
        if (this.hovered.mode.has(SelectionMode.Curve) && !this.selected.curves.has(parentItem)) {
            if (!this.hovered.curves.has(parentItem)) {
                this.hovered.removeAll();
                this.hovered.addCurve(parentItem);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.selected.solids.has(parentItem) && !this.selected.hasSelectedChildren(parentItem)) {
            if (!this.hovered.solids.has(parentItem)) {
                this.hovered.removeAll();
                this.hovered.addSolid(parentItem);
            }
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        if (this.hovered.mode.has(SelectionMode.Face) && object instanceof Face && !this.selected.faces.has(object)) {
            if (!this.hovered.faces.has(object)) {
                this.hovered.removeAll();
                this.hovered.addFace(object, parentItem);
            }
            return true;
        } else if (this.hovered.mode.has(SelectionMode.Edge) && object instanceof CurveEdge && !this.selected.edges.has(object)) {
            if (!this.hovered.edges.has(object)) {
                this.hovered.removeAll();
                this.hovered.addEdge(object, parentItem);
            }
            return true;
        }
        return false;
    }

    region(object: Region, parentItem: PlaneInstance<Region>): boolean {
        if (!this.hovered.mode.has(SelectionMode.Face)) return false;
        if (!this.hovered.regions.has(parentItem)) {
            this.hovered.removeAll();
            this.hovered.addRegion(parentItem);
        }

        return true;
    }

    controlPoint(object: ControlPoint, parentItem: SpaceInstance<Curve3D>): boolean {
        if (!this.hovered.mode.has(SelectionMode.ControlPoint)) return false;
        if (!this.selected.curves.has(parentItem) && !this.selected.hasSelectedChildren(parentItem)) return false;

        if (!this.selected.controlPoints.has(object)) {
            this.hovered.removeAll();
            this.hovered.addControlPoint(object, parentItem)
            return true;
        }
        return false;
    }
}
