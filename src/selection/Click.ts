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
        const parentItem = object.parentItem;

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
        const { hovered, selected } = this;
        hovered.removeAll();

        const parentsAdded = new Set<Solid>();
        for (const object of set) {
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (parentsAdded.has(parentItem)) continue;

                if (this.mode.has(SelectionMode.Solid) && !selected.solids.has(parentItem) && !selected.hasSelectedChildren(parentItem)) {
                    parentsAdded.add(parentItem);
                    selected.addSolid(parentItem);
                } else if (object instanceof Face) {
                    if (!this.mode.has(SelectionMode.Face)) continue;
                    selected.addFace(object);
                } else if (object instanceof CurveEdge) {
                    if (!this.mode.has(SelectionMode.CurveEdge)) continue;
                    selected.addEdge(object);
                }
            } else if (object instanceof Curve3D) {
                if (!this.mode.has(SelectionMode.Curve)) continue;
                selected.addCurve(object.parentItem);
            } else if (object instanceof ControlPoint) {
                if (!this.mode.has(SelectionMode.ControlPoint)) continue;
                selected.addControlPoint(object);
                selected.removeCurve(object.parentItem);
            } else if (object instanceof Region) {
                if (!this.mode.has(SelectionMode.Face)) continue;
                selected.addRegion(object.parentItem);
            }
        }
    }
}