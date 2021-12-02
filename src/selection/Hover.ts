import { Intersectable } from "../visual_model/Intersectable"
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../visual_model/VisualModel";
import { SelectionMode, SelectionStrategy } from "./ChangeSelectionExecutor";
import { ModifiesSelection } from "./SelectionDatabase";

export class HoverStrategy implements SelectionStrategy {
    constructor(
        private readonly mode: Set<SelectionMode>,
        private readonly selected: ModifiesSelection,
        private readonly hovered: ModifiesSelection
    ) { }

    emptyIntersection(): void {
        this.hovered.removeAll();
    }

    curve3D(object: Curve3D, parentItem: SpaceInstance<Curve3D>): boolean {
        if (!this.mode.has(SelectionMode.Curve)) return false;
        if (this.selected.hasSelectedChildren(parentItem)) return false;

        this.hovered.removeAll();
        this.hovered.addCurve(parentItem);
        return true;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.mode.has(SelectionMode.Solid)) return false;

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
        if (this.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (!this.hovered.faces.has(object)) {
                this.hovered.removeAll();
                this.hovered.addFace(object, parentItem);
            }
            return true;
        } else if (this.mode.has(SelectionMode.CurveEdge) && object instanceof CurveEdge) {
            if (!this.hovered.edges.has(object)) {
                this.hovered.removeAll();
                this.hovered.addEdge(object, parentItem);
            }
            return true;
        }
        return false;
    }

    region(object: Region, parentItem: PlaneInstance<Region>): boolean {
        if (!this.mode.has(SelectionMode.Face)) return false;
        if (!this.hovered.regions.has(parentItem)) {
            this.hovered.removeAll();
            this.hovered.addRegion(parentItem);
        }

        return true;
    }

    controlPoint(object: ControlPoint, parentItem: SpaceInstance<Curve3D>): boolean {
        if (!this.mode.has(SelectionMode.ControlPoint)) return false;
        if (!this.selected.curves.has(parentItem) && !this.selected.hasSelectedChildren(parentItem)) return false;

        if (!this.selected.controlPoints.has(object)) {
            this.hovered.removeAll();
            this.hovered.addControlPoint(object, parentItem)
            return true;
        }
        return false;
    }

    box(set: Set<Intersectable>) {
        const { hovered, selected } = this;
        hovered.removeAll();

        const parentsAdded = new Set<Solid>();
        for (const object of set) {
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (parentsAdded.has(parentItem)) continue;

                if (this.mode.has(SelectionMode.Solid) && !selected.solids.has(parentItem) && !selected.hasSelectedChildren(parentItem)) {
                    hovered.addSolid(parentItem);
                } else if (object instanceof Face) {
                    if (!this.mode.has(SelectionMode.Face)) continue;
                    hovered.addFace(object, object.parentItem);
                } else if (object instanceof CurveEdge) {
                    if (!this.mode.has(SelectionMode.CurveEdge)) continue;
                    hovered.addEdge(object, object.parentItem);
                }
            } else if (object instanceof Curve3D) {
                if (!this.mode.has(SelectionMode.Curve)) continue;
                hovered.addCurve(object.parentItem);
            } else if (object instanceof ControlPoint) {
                if (!this.mode.has(SelectionMode.ControlPoint)) continue;
                hovered.addControlPoint(object, object.parentItem);
            } else if (object instanceof Region) {
                if (!this.mode.has(SelectionMode.Face)) continue;
                hovered.addRegion(object.parentItem);
            }
        }
    }
}
