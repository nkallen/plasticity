import { Intersectable } from "../visual_model/Intersectable";
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from "../visual_model/VisualModel";
import { ChangeSelectionModifier, ChangeSelectionOption, SelectionMode } from "./ChangeSelectionExecutor";
import { ModifiesSelection, SelectionModeSet } from "./SelectionDatabase";

export class ClickStrategy {
    constructor(
        protected readonly mode: SelectionModeSet,
        protected readonly selected: ModifiesSelection,
        protected readonly hovered: ModifiesSelection,
        protected readonly writeable: ModifiesSelection
    ) { }

    emptyIntersection(modifier: ChangeSelectionModifier, option: ChangeSelectionOption): void {
        if (modifier !== ChangeSelectionModifier.Replace) return;
        this.writeable.removeAll();
        this.hovered.removeAll();
    }

    curve3D(object: Curve3D, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): boolean {
        if (!this.mode.has(SelectionMode.Curve) && !(ChangeSelectionOption.IgnoreMode & option)) return false;
        const parentItem = object.parentItem;
        if (this.selected.hasSelectedChildren(parentItem)) return false;

        return this.modify(modifier,
            () => {
                this.writeable.addCurve(parentItem);
                return true;
            },
            () => {
                this.writeable.removeCurve(parentItem);
                return true;
            });
    }

    controlPoint(object: ControlPoint, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): boolean {
        if (!this.mode.has(SelectionMode.ControlPoint) && !(ChangeSelectionOption.IgnoreMode & option)) return false;

        return this.modify(modifier,
            () => {
                const parentItem = object.parentItem;
                if (this.selected.curves.has(parentItem)) {
                    this.writeable.removeCurve(parentItem);
                }
                this.writeable.addControlPoint(object);
                return true;
            },
            () => {
                this.writeable.removeControlPoint(object);
                return true;
            });
    }


    solid(object: TopologyItem, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): boolean {
        if (!this.mode.has(SelectionMode.Solid) || (ChangeSelectionOption.IgnoreMode & option)) return false;
        const parentItem = object.parentItem;

        if (this.selected.solids.has(parentItem)) {
            return this.modify(modifier,
                () => false,
                () => {
                    this.writeable.removeSolid(parentItem);
                    return true;
                });
        } else if (!this.selected.hasSelectedChildren(parentItem) || this.mode.is(SelectionMode.Solid)) {
            return this.modify(modifier,
                () => {
                    this.writeable.addSolid(parentItem);
                    return true;
                },
                () => true
            );
        }
        return false;
    }

    topologicalItem(object: TopologyItem, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): boolean {
        if (object instanceof Face && (this.mode.has(SelectionMode.Face) || (ChangeSelectionOption.IgnoreMode & option))) {
            this.modify(modifier,
                () => {
                    this.writeable.addFace(object);
                    this.writeable.removeSolid(object.parentItem);
                },
                () => this.writeable.removeFace(object));
            return true;
        } else if (object instanceof CurveEdge && (this.mode.has(SelectionMode.CurveEdge) || (ChangeSelectionOption.IgnoreMode & option))) {
            this.modify(modifier,
                () => {
                    this.writeable.addEdge(object);
                    this.writeable.removeSolid(object.parentItem);
                },
                () => this.writeable.removeEdge(object));
            return true;
        }
        return false;
    }

    protected modify<T>(modifier: ChangeSelectionModifier, add: () => T, remove: () => T): T {
        this.hovered.removeAll();
        if (modifier === ChangeSelectionModifier.Remove) {
            return remove();
        } else if (modifier === ChangeSelectionModifier.Add) {
            return add();
        } else {
            this.writeable.removeAll();
            return add();
        }
    }

    region(object: Region, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): boolean {
        if (!this.mode.has(SelectionMode.Region) && !(ChangeSelectionOption.IgnoreMode & option)) return false;
        const parentItem = object.parentItem;

        return this.modify(modifier,
            () => {
                this.writeable.addRegion(parentItem);
                return true;
            },
            () => {
                this.writeable.removeRegion(parentItem);
                return true;
            });
    }

    box(set: ReadonlySet<Intersectable | Solid>, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): void {
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
            if (object instanceof Solid) {
                if (!this.mode.has(SelectionMode.Solid) && !(ChangeSelectionOption.IgnoreMode & option)) continue;
                if (parentsVisited.has(object)) continue;
                if (this.selected.hasSelectedChildren(object)) continue;
                if (modifier === ChangeSelectionModifier.Add && this.selected.solids.has(object)) continue;
                if (modifier === ChangeSelectionModifier.Remove && !this.selected.solids.has(object)) continue;

                parentsVisited.add(object);
                changedSolids.add(object);
            } else if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (parentsVisited.has(parentItem)) continue;
                if (this.mode.has(SelectionMode.Solid) && !this.selected.solids.has(parentItem) && !this.selected.hasSelectedChildren(parentItem)) continue;

                if (object instanceof Face) {
                    if (!this.mode.has(SelectionMode.Face)) continue;
                    if (modifier === ChangeSelectionModifier.Add && this.selected.faces.has(object)) continue;
                    if (modifier === ChangeSelectionModifier.Remove && !this.selected.faces.has(object)) continue;
                    changedFaces.add(object);
                } else if (object instanceof CurveEdge) {
                    if (!this.mode.has(SelectionMode.CurveEdge)) continue;
                    if (modifier === ChangeSelectionModifier.Add && this.selected.edges.has(object)) continue;
                    if (modifier === ChangeSelectionModifier.Remove && !this.selected.edges.has(object)) continue;
                    changedEdges.add(object);
                }
                changedParents.add(object.parentItem);
            } else if (object instanceof Curve3D) {
                if (!this.mode.has(SelectionMode.Curve) && !(ChangeSelectionOption.IgnoreMode & option)) continue;
                const parentItem = object.parentItem;
                if (modifier === ChangeSelectionModifier.Add && this.selected.curves.has(parentItem)) continue;
                if (modifier === ChangeSelectionModifier.Remove && !this.selected.curves.has(parentItem)) continue;
                changedCurves.add(object.parentItem);
                parentsVisited.add(parentItem);
            } else if (object instanceof ControlPoint) {
                const parentItem = object.parentItem;
                if (parentsVisited.has(parentItem)) continue;
                if (!this.mode.has(SelectionMode.ControlPoint)) continue;
                if (modifier === ChangeSelectionModifier.Add && this.selected.controlPoints.has(object)) continue;
                if (modifier === ChangeSelectionModifier.Remove && !this.selected.controlPoints.has(object)) continue;

                changedPoints.add(object);
                changedParents.add(parentItem);
            } else if (object instanceof Region) {
                if (!this.mode.has(SelectionMode.Region)) continue;
                changedRegions.add(object.parentItem);
            }
        }

        this.modify(modifier,
            () => {
                for (const solid of changedSolids) this.writeable.addSolid(solid);
                for (const face of changedFaces) this.writeable.addFace(face);
                for (const edge of changedEdges) this.writeable.addEdge(edge);
                for (const curve of changedCurves) this.writeable.addCurve(curve);
                for (const region of changedRegions) this.writeable.addRegion(region);
                for (const point of changedPoints) this.writeable.addControlPoint(point);

                for (const parent of changedParents) this.writeable.remove(parent);
            },
            () => {
                for (const solid of changedSolids) this.writeable.removeSolid(solid);
                for (const face of changedFaces) this.writeable.removeFace(face);
                for (const edge of changedEdges) this.writeable.removeEdge(edge);
                for (const curve of changedCurves) this.writeable.removeCurve(curve);
                for (const region of changedRegions) this.writeable.removeRegion(region);
                for (const point of changedPoints) this.writeable.removeControlPoint(point);
            });
    }

    dblClick(intersection: Intersectable, modifier: ChangeSelectionModifier): boolean {
        if (intersection instanceof TopologyItem) {
            return this.modify(modifier,
                () => {
                    this.selected.deselectChildren(intersection.parentItem);
                    this.writeable.addSolid(intersection.parentItem);
                    return true;
                },
                () => {
                    this.writeable.removeSolid(intersection.parentItem);
                    return true;
                });
        }
        return false;
    }
}


export class NonemptyClickStrategy extends ClickStrategy {
    override emptyIntersection(modifier: ChangeSelectionModifier, option: ChangeSelectionOption): void { }
}

export class HoverStrategy extends ClickStrategy {
    emptyIntersection(modifier: ChangeSelectionModifier, option: ChangeSelectionOption): void {
        this.writeable.removeAll();
        this.hovered.removeAll();
    }

    protected modify<T>(modifier: ChangeSelectionModifier, add: () => T, remove: () => T): T {
        this.hovered.removeAll();
        if (modifier === ChangeSelectionModifier.Remove) {
            return add();
        } else if (modifier === ChangeSelectionModifier.Add) {
            return add();
        } else {
            this.writeable.removeAll();
            return add();
        }
    }
}