import { Intersectable } from "../visual_model/Intersectable";
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../visual_model/VisualModel";
import { ChangeSelectionModifier, SelectionMode, SelectionStrategy } from "./ChangeSelectionExecutor";
import { ModifiesSelection } from "./SelectionDatabase";

export class ClickStrategy implements SelectionStrategy {
    constructor(
        private readonly mode: Set<SelectionMode>,
        private readonly selected: ModifiesSelection,
        private readonly hovered: ModifiesSelection
    ) { }

    emptyIntersection(modifier: ChangeSelectionModifier): void {
        this.selected.removeAll();
        this.hovered.removeAll();
    }

    curve3D(object: Curve3D, modifier: ChangeSelectionModifier): boolean {
        if (!this.mode.has(SelectionMode.Curve)) return false;
        const parentItem = object.parentItem;
        if (this.selected.hasSelectedChildren(parentItem)) return false;

        return this.modify(modifier,
            () => {
                this.selected.addCurve(parentItem);
                return true;
            },
            () => {
                this.selected.removeCurve(parentItem);
                return true;
            });
    }

    controlPoint(object: ControlPoint, modifier: ChangeSelectionModifier): boolean {
        if (!this.mode.has(SelectionMode.ControlPoint)) return false;

        return this.modify(modifier,
            () => {
                const parentItem = object.parentItem;
                if (this.selected.curves.has(parentItem)) {
                    this.selected.removeCurve(parentItem);
                }
                this.selected.addControlPoint(object);
                return true;
            },
            () => {
                this.selected.removeControlPoint(object);
                return true;
            });
    }


    solid(object: TopologyItem, modifier: ChangeSelectionModifier): boolean {
        if (!this.mode.has(SelectionMode.Solid)) return false;
        const parentItem = object.parentItem;

        if (this.selected.solids.has(parentItem)) {
            return this.modify(modifier,
                () => {
                    if (this.topologicalItem(object, modifier)) {
                        this.selected.removeSolid(parentItem);
                        return true;
                    }
                    return true;
                },
                () => {
                    this.selected.removeSolid(parentItem);
                    return true;
                });
        } else if (!this.selected.hasSelectedChildren(parentItem)) {
            return this.modify(modifier,
                () => {
                    this.selected.addSolid(parentItem);
                    return true;
                },
                () => {
                    return true;
                });
        }
        return false;
    }

    topologicalItem(object: TopologyItem, modifier: ChangeSelectionModifier): boolean {
        if (this.mode.has(SelectionMode.Face) && object instanceof Face) {
            this.modify(modifier, () => this.selected.addFace(object), () => this.selected.removeFace(object));
            return true;
        } else if (this.mode.has(SelectionMode.CurveEdge) && object instanceof CurveEdge) {
            this.modify(modifier, () => this.selected.addEdge(object), () => this.selected.removeEdge(object));
            return true;
        }
        return false;
    }

    private modify<T>(modifier: ChangeSelectionModifier, add: () => T, remove: () => T): T {
        this.hovered.removeAll();
        if (modifier === ChangeSelectionModifier.Remove) {
            return remove();
        } else if (modifier === ChangeSelectionModifier.Add) {
            return add();
        } else {
            this.selected.removeAll();
            return add();
        }
    }

    region(object: Region, modifier: ChangeSelectionModifier): boolean {
        if (!this.mode.has(SelectionMode.Face)) return false;
        const parentItem = object.parentItem;

        return this.modify(modifier,
            () => {
                this.selected.addRegion(parentItem);
                return true;
            },
            () => {
                this.selected.removeRegion(parentItem);
                return true;
            });
    }

    box(set: Set<Intersectable>, modifier: ChangeSelectionModifier): void {
        const { hovered } = this;
        hovered.removeAll();

        const parentsVisited = new Set<Solid | SpaceInstance<Curve3D>>();
        const changedParents = new Set<Solid | SpaceInstance<Curve3D>>();
        const changedSolids = new Set<Solid>();
        const changedFaces = new Set<Face>();
        const changedEdges = new Set<CurveEdge>();
        const changedCurves = new Set<SpaceInstance<Curve3D>>();
        const changedRegions = new Set<PlaneInstance<Region>>();
        const changedPoints = new Set<ControlPoint>();

        for (const object of set) {
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (parentsVisited.has(parentItem)) continue;

                if (this.mode.has(SelectionMode.Solid) && !this.selected.solids.has(parentItem) && modifier !== ChangeSelectionModifier.Remove) {
                    parentsVisited.add(parentItem);
                    changedSolids.add(parentItem);
                } else if (this.mode.has(SelectionMode.Solid) && this.selected.solids.has(parentItem) && modifier === ChangeSelectionModifier.Remove) {
                    parentsVisited.add(parentItem);
                    changedSolids.add(parentItem);
                } else if (object instanceof Face) {
                    if (!this.mode.has(SelectionMode.Face)) continue;
                    changedFaces.add(object);
                    changedParents.add(object.parentItem);
                } else if (object instanceof CurveEdge) {
                    if (!this.mode.has(SelectionMode.CurveEdge)) continue;
                    changedEdges.add(object);
                    changedParents.add(object.parentItem);
                }
            } else if (object instanceof Curve3D) {
                if (!this.mode.has(SelectionMode.Curve)) continue;
                const parentItem = object.parentItem;
                changedCurves.add(object.parentItem);
                parentsVisited.add(parentItem);
            } else if (object instanceof ControlPoint) {
                const parentItem = object.parentItem;
                if (parentsVisited.has(parentItem)) continue;

                if (!this.mode.has(SelectionMode.ControlPoint)) continue;
                changedPoints.add(object);
                changedParents.add(parentItem);
            } else if (object instanceof Region) {
                if (!this.mode.has(SelectionMode.Face)) continue;
                changedRegions.add(object.parentItem);
            }
        }

        this.modify(modifier,
            () => {
                for (const solid of changedSolids) this.selected.addSolid(solid);
                for (const face of changedFaces) this.selected.addFace(face);
                for (const edge of changedEdges) this.selected.addEdge(edge);
                for (const curve of changedCurves) this.selected.addCurve(curve);
                for (const region of changedRegions) this.selected.addRegion(region);
                for (const point of changedPoints) this.selected.addControlPoint(point);

                for (const parent of changedParents) this.selected.remove(parent);
            },
            () => {
                for (const solid of changedSolids) this.selected.removeSolid(solid);
                for (const face of changedFaces) this.selected.removeFace(face);
                for (const edge of changedEdges) this.selected.removeEdge(edge);
                for (const curve of changedCurves) this.selected.removeCurve(curve);
                for (const region of changedRegions) this.selected.removeRegion(region);
                for (const point of changedPoints) this.selected.removeControlPoint(point);
            });
    }
}