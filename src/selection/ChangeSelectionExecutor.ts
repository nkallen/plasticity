import { DatabaseLike } from "../editor/DatabaseLike";
import { EditorSignals } from '../editor/EditorSignals';
import { Empty, ImageEmpty } from "../editor/Empties";
import { Group } from "../editor/Groups";
import { RealNodeItem } from "../editor/Nodes";
import { Scene } from "../editor/Scene";
import { assertUnreachable } from "../util/Util";
import { Intersectable, Intersection } from "../visual_model/Intersectable";
import * as visual from '../visual_model/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, Region } from '../visual_model/VisualModel';
import { ClickStrategy, HoverStrategy } from './Click';
import { SelectionConversionStrategy } from "./SelectionConversionStrategy";
import { HasSelectedAndHovered, Selectable } from './SelectionDatabase';
import { SelectionMode } from "./SelectionModeSet";

export enum ChangeSelectionModifier {
    Replace, Add, Remove
}

export enum ChangeSelectionOption {
    None = 0,
    IgnoreMode = 1 << 0,
    Extend = 1 << 2,
}

export class ChangeSelectionExecutor {
    private readonly conversionStrategy = new SelectionConversionStrategy(this.selection, this.db);

    constructor(
        private readonly selection: HasSelectedAndHovered,
        private readonly db: DatabaseLike,
        private readonly scene: Scene,
        private readonly signals: EditorSignals,
        private readonly prohibitions: ReadonlySet<Selectable> = new Set(),
        private readonly clickStrategy = new ClickStrategy(db, scene, selection.mode, selection.selected, selection.hovered, selection.selected),
        private readonly hoverStrategy = new HoverStrategy(db, scene, selection.mode, selection.selected, selection.hovered, selection.hovered)
    ) {
        this.onClick = this.wrapFunction(this.onClick);
        this.onHover = this.wrapFunction(this.onHover);
        this.onBoxHover = this.wrapFunction(this.onBoxHover);
        this.onBoxSelect = this.wrapFunction(this.onBoxSelect);
        this.onOutlinerHover = this.wrapFunction(this.onOutlinerHover);
        this.onOutlinerSelect = this.wrapFunction(this.onOutlinerSelect);
        this.onCreatorSelect = this.wrapFunction(this.onCreatorSelect);
        this.onConvert = this.wrapFunction(this.onConvert);
    }

    private onIntersection(intersections: Intersection[], strategy: ClickStrategy, modifier: ChangeSelectionModifier, option: ChangeSelectionOption): Intersection | undefined {
        const { prohibitions } = this;

        if (intersections.length == 0) {
            strategy.emptyIntersection(modifier, option);
            return;
        }

        const objects = new Set(intersections.map(i => i.object));
        for (const intersection of intersections) {
            const object = intersection.object;
            const prohibitable = object instanceof ImageEmpty ? object : object.parentItem;
            if (prohibitions.has(prohibitable)) continue;

            if (object instanceof Face || object instanceof CurveEdge) {
                if (prohibitions.has(object)) continue;

                if (strategy.solid(object, modifier, option)) return intersection;
                if (strategy.topologicalItem(object, objects, modifier, option)) return intersection;
            } else if (object instanceof Curve3D) {
                if (strategy.curve3D(object, modifier, option)) return intersection;
            } else if (object instanceof Region) {
                if (strategy.region(object, modifier, option)) return intersection;
            } else if (object instanceof ControlPoint) {
                if (prohibitions.has(object)) continue;

                if (strategy.controlPoint(object, modifier, option)) return intersection;
            } else if (object instanceof Empty) {
                if (strategy.empty(object, modifier, option)) return intersection;
            } else {
                assertUnreachable(object);
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
        this.hoverStrategy.box(this.filterProhibited(hover), modifier, ChangeSelectionOption.None);
    }

    onBoxSelect(select: ReadonlySet<Intersectable | visual.Solid>, modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(this.filterProhibited(select), modifier, ChangeSelectionOption.None);
    }

    onCreatorSelect(topologyItems: (visual.Face | visual.CurveEdge)[], modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(new Set(topologyItems), modifier, ChangeSelectionOption.None);
    }

    onOutlinerHover(items: Iterable<RealNodeItem>, modifier: ChangeSelectionModifier, option: ChangeSelectionOption) {
        const intersectables = this.getIntersectables(items);
        this.hoverStrategy.box(new Set(intersectables), modifier, ChangeSelectionOption.IgnoreMode | option);
    }

    onOutlinerSelect(items: Iterable<RealNodeItem>, modifier: ChangeSelectionModifier, option: ChangeSelectionOption) {
        const intersectables = this.getIntersectables(items);
        this.clickStrategy.box(new Set(intersectables), modifier, ChangeSelectionOption.IgnoreMode | option);
    }

    private getIntersectables(items: Iterable<RealNodeItem>) {
        const intersectables = [];
        for (const item of items) {
            let intersectable: Intersectable | visual.Solid | Group | Empty;
            if (item instanceof visual.Solid)
                intersectable = item;
            else if (item instanceof visual.SpaceInstance || item instanceof visual.PlaneInstance)
                intersectable = item.underlying;
            else if (item instanceof Group)
                intersectable = item;
            else if (item instanceof Empty)
                intersectable = item;
            else assertUnreachable(item);
            intersectables.push(intersectable);
        }
        return intersectables;
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
                } else if (intersectable instanceof visual.Face || intersectable instanceof visual.CurveEdge) {
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
