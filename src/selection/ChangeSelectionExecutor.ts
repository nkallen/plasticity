import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from "../editor/DatabaseLike";
import { Intersectable, Intersection } from "../visual_model/Intersectable";
import * as visual from '../visual_model/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, Region } from '../visual_model/VisualModel';
import { ClickStrategy, HoverStrategy } from './Click';
import { SelectionConversionStrategy } from './SelectionConversion';
import { HasSelectedAndHovered, Selectable } from './SelectionDatabase';

export enum SelectionMode {
    CurveEdge, Face, Solid, Curve, ControlPoint
}

export const SelectionModeAll = [SelectionMode.CurveEdge, SelectionMode.Face, SelectionMode.Solid, SelectionMode.Curve, SelectionMode.ControlPoint];

export enum ChangeSelectionModifier {
    Replace, Add, Remove
}

export enum ChangeSelectionOption {
    None = 0,
    IgnoreMode = 1 << 0,
    Extend = 1 << 2,
}

export class ChangeSelectionExecutor {
    private readonly conversionStrategy: SelectionConversionStrategy;

    constructor(
        selection: HasSelectedAndHovered,
        db: DatabaseLike,
        private readonly signals: EditorSignals,
        private readonly prohibitions: ReadonlySet<Selectable> = new Set(),
        private readonly clickStrategy = new ClickStrategy(selection.mode, selection.selected, selection.hovered, selection.selected),
        private readonly hoverStrategy = new HoverStrategy(selection.mode, selection.selected, selection.hovered, selection.hovered)
    ) {
        this.conversionStrategy = new SelectionConversionStrategy(selection, db);

        this.onClick = this.wrapFunction(this.onClick);
        this.onHover = this.wrapFunction(this.onHover);
        this.onBoxHover = this.wrapFunction(this.onBoxHover);
        this.onBoxSelect = this.wrapFunction(this.onBoxSelect);
        this.onCreatorSelect = this.wrapFunction(this.onCreatorSelect);
        this.onConvert = this.wrapFunction(this.onConvert);
    }

    private onIntersection(intersections: Intersection[], strategy: ClickStrategy, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): Intersection | undefined {
        const { prohibitions } = this;

        if (intersections.length == 0) {
            strategy.emptyIntersection(modifier, option);
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object;
            if (prohibitions.has(object.parentItem)) continue;

            if (object instanceof Face || object instanceof CurveEdge) {
                if (prohibitions.has(object)) continue;

                if (strategy.solid(object, modifier, option)) return intersection;
                if (strategy.topologicalItem(object, modifier, option)) return intersection;
            } else if (object instanceof Curve3D) {
                if (strategy.curve3D(object, modifier, option)) return intersection;
            } else if (object instanceof Region) {
                if (strategy.region(object, modifier, option)) return intersection;
            } else if (object instanceof ControlPoint) {
                if (prohibitions.has(object)) continue;

                if (strategy.controlPoint(object, modifier, option)) return intersection;
            } else {
                console.error(object);
                throw new Error("Invalid precondition");
            }
        }

        strategy.emptyIntersection(modifier, option);
        return;
    }

    onClick(intersections: Intersection[], modifier: ChangeSelectionModifier, option: ChangeSelectionOption): Intersection | undefined {
        return this.onIntersection(intersections, this.clickStrategy, modifier, option);
    }

    onDblClick(intersections: Intersection[], modifier: ChangeSelectionModifier): Intersection | undefined {
        if (intersections.length === 0) return;
        const first = intersections[0];
        if (this.clickStrategy.dblClick(first.object, modifier)) return first;
    }

    onHover(intersections: Intersection[], modifier: ChangeSelectionModifier, option: ChangeSelectionOption): void {
        this.onIntersection(intersections, this.hoverStrategy, modifier, option);
    }

    onBoxHover(hover: ReadonlySet<Intersectable | visual.Solid>, modifier: ChangeSelectionModifier) {
        this.hoverStrategy.box(this.filterProhibited(hover), modifier);
    }

    onBoxSelect(select: ReadonlySet<Intersectable | visual.Solid>, modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(this.filterProhibited(select), modifier);
    }

    onCreatorSelect(topologyItems: visual.TopologyItem[], modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(new Set(topologyItems), modifier);
    }

    onOutlinerSelect(items: Iterable<visual.Item>, modifier: ChangeSelectionModifier) {
        const intersectables = [];
        for (const item of items) {
            let intersectable: Intersectable | visual.Solid;
            if (item instanceof visual.Solid) intersectable = item;
            else if (item instanceof visual.SpaceInstance || item instanceof visual.PlaneInstance) intersectable = item.underlying;
            else throw new Error("Invalid condition");
            intersectables.push(intersectable);
        }

        this.clickStrategy.box(new Set(intersectables), modifier);
    }

    onConvert(mode: SelectionMode, modifier: ChangeSelectionModifier) {
        this.conversionStrategy.convert(mode, modifier);
    }

    private filterProhibited(select: ReadonlySet<Intersectable | visual.Solid>) {
        const { prohibitions } = this;
        if (prohibitions.size === 0) return select;
        const result = new Set(select);
        if (prohibitions.size > 0) {
            for (const intersectable of select) {
                if (intersectable instanceof visual.Solid) {
                    if (!prohibitions.has(intersectable)) continue;
                } else if (intersectable instanceof visual.TopologyItem) {
                    if (!prohibitions.has(intersectable.parentItem) && !prohibitions.has(intersectable)) continue;
                } else if (intersectable instanceof visual.ControlPoint) {
                    if (prohibitions.has(intersectable)) continue;
                }

                result.delete(intersectable);
            }
        }
        return result;
    }

    // TODO: aggregate selection as well
    private aggregate<R>(f: () => R): R {
        const { signals } = this;
        const hoverAdded = new Set<Selectable>(), hoverRemoved = new Set<Selectable>();
        const addHovered = (s: Selectable) => hoverAdded.add(s);
        const removeHovered = (s: Selectable) => hoverRemoved.add(s);

        const selectedAdded = new Set<Selectable>(), selectedRemoved = new Set<Selectable>();
        const addSelected = (s: Selectable) => selectedAdded.add(s);
        const removeSelected = (s: Selectable) => selectedRemoved.add(s);

        signals.objectHovered.add(addHovered);
        signals.objectUnhovered.add(removeHovered);
        signals.objectSelected.add(addSelected);
        signals.objectDeselected.add(removeSelected);

        let result: R;
        try { result = f() }
        finally {
            signals.objectHovered.remove(addHovered);
            signals.objectUnhovered.remove(removeHovered);
            signals.objectSelected.remove(addSelected);
            signals.objectDeselected.remove(removeSelected);
        }

        if (hoverAdded.size > 0 || hoverRemoved.size > 0) this.signals.hoverDelta.dispatch({ added: hoverAdded, removed: hoverRemoved });
        if (selectedAdded.size > 0 || selectedRemoved.size > 0) this.signals.selectionDelta.dispatch({ added: selectedAdded, removed: selectedRemoved });

        return result;
    }

    private wrapFunction<A extends any[], R>(f: (...args: A) => R): (...args: A) => R {
        return (...args: A): R => this.aggregate(() => f.call(this, ...args));
    }
}


export type SelectionDelta = {
    added: Set<Selectable>;
    removed: Set<Selectable>;
};
