import { Intersectable } from "../visual_model/Intersectable";
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../visual_model/VisualModel";
import { SelectionMode, SelectionStrategy } from "./SelectionInteraction";
import { ModifiesSelection } from "./SelectionManager";

export class ClickStrategy implements SelectionStrategy {
    constructor(
        private readonly mode: Set<SelectionMode>,
        private readonly selected: ModifiesSelection,
        private readonly hovered: ModifiesSelection
    ) { }

    emptyIntersection(): void {
        this.selected.removeAll();
        this.hovered.removeAll();
    }

    curve3D(object: Curve3D, parentItem: SpaceInstance<Curve3D>): boolean {
        if (!this.mode.has(SelectionMode.Curve)) return false;
        if (this.selected.hasSelectedChildren(parentItem)) return false;

        if (this.selected.curves.has(parentItem)) {
            this.selected.removeCurve(parentItem);
        } else {
            this.selected.addCurve(parentItem);
        }
        this.hovered.removeAll();
        return true;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (!this.mode.has(SelectionMode.Solid)) return false;

        if (this.selected.solids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selected.removeSolid(parentItem);
                this.hovered.removeAll();
                return true;
            }
            return false;
        } else if (!this.selected.hasSelectedChildren(parentItem)) {
            this.selected.addSolid(parentItem);
            this.hovered.removeAll();
            return true;
        }

        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        if (this.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selected.faces.has(object)) {
                this.selected.removeFace(object, parentItem);
            } else {
                this.selected.addFace(object, parentItem);
            }
            this.hovered.removeAll();
            return true;
        } else if (this.mode.has(SelectionMode.CurveEdge) && object instanceof CurveEdge) {
            if (this.selected.edges.has(object)) {
                this.selected.removeEdge(object, parentItem);
            } else {
                this.selected.addEdge(object, parentItem);
            }
            this.hovered.removeAll();
            return true;
        }
        return false;
    }

    region(object: Region, parentItem: PlaneInstance<Region>): boolean {
        if (!this.mode.has(SelectionMode.Face)) return false;

        if (this.selected.regions.has(parentItem)) {
            this.selected.removeRegion(parentItem);
        } else {
            this.selected.addRegion(parentItem);
        }
        this.hovered.removeAll();
        return true;
    }

    controlPoint(object: ControlPoint, parentItem: SpaceInstance<Curve3D>): boolean {
        if (!this.mode.has(SelectionMode.ControlPoint)) return false;
        if (!this.selected.curves.has(parentItem) && !this.selected.hasSelectedChildren(parentItem)) return false;

        if (this.selected.controlPoints.has(object)) {
            this.selected.removeControlPoint(object, parentItem);
        } else {
            if (this.selected.curves.has(parentItem)) {
                this.selected.removeCurve(parentItem);
            }
            this.selected.addControlPoint(object, parentItem);
        }
        this.hovered.removeAll();
        return true;
    }

    box(set: Set<Intersectable>) {
        const { hovered, selected } = this;
        hovered.removeAll();

        for (const object of set) {
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.mode.has(SelectionMode.Solid) && !selected.solids.has(parentItem) && !selected.hasSelectedChildren(parentItem)) {
                    selected.addSolid(parentItem);
                } else if (object instanceof Face) {
                    if (!this.mode.has(SelectionMode.Face)) continue;
                    selected.addFace(object, object.parentItem);
                } else if (object instanceof CurveEdge) {
                    if (!this.mode.has(SelectionMode.CurveEdge)) continue;
                    selected.addEdge(object, object.parentItem);
                }
            } else if (object instanceof Curve3D) {
                if (!this.mode.has(SelectionMode.Curve)) continue;
                selected.addCurve(object.parentItem);
            } else if (object instanceof ControlPoint) {
                if (!this.mode.has(SelectionMode.ControlPoint)) continue;
                selected.addControlPoint(object, object.parentItem);
                selected.removeCurve(object.parentItem);
            } else if (object instanceof Region) {
                if (!this.mode.has(SelectionMode.Face)) continue;
                selected.addRegion(object.parentItem);
            }
        }
    }
}