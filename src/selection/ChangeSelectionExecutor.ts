import { EditorSignals } from '../editor/EditorSignals';
import MaterialDatabase from '../editor/MaterialDatabase';
import { Intersectable, Intersection } from "../visual_model/Intersectable";
import * as visual from '../visual_model/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, Region, TopologyItem } from '../visual_model/VisualModel';
import { ClickStrategy } from './Click';
import { HoverStrategy } from './Hover';
import { HasSelectedAndHovered, Selectable } from './SelectionDatabase';

export enum SelectionMode {
    CurveEdge, Face, Solid, Curve, ControlPoint
}

export const SelectionModeAll = [SelectionMode.CurveEdge, SelectionMode.Face, SelectionMode.Solid, SelectionMode.Curve, SelectionMode.ControlPoint];

export enum ChangeSelectionModifier {
    Replace, Add, Remove
}

export interface SelectionStrategy {
    emptyIntersection(modifier: ChangeSelectionModifier): void;
    solid(object: TopologyItem, modifier: ChangeSelectionModifier): boolean;
    topologicalItem(object: TopologyItem, modifier: ChangeSelectionModifier): boolean;
    curve3D(object: Curve3D, modifier: ChangeSelectionModifier): boolean;
    region(object: Region, modifier: ChangeSelectionModifier): boolean;
    controlPoint(object: ControlPoint, modifier: ChangeSelectionModifier): boolean;
    box(set: Set<Intersectable>, modifier: ChangeSelectionModifier): void;
}

export class ChangeSelectionExecutor {
    private readonly clickStrategy: ClickStrategy;
    private readonly hoverStrategy: HoverStrategy;

    constructor(
        readonly selection: HasSelectedAndHovered,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        this.clickStrategy = new ClickStrategy(selection.mode, selection.selected, selection.hovered);
        this.hoverStrategy = new HoverStrategy(selection.mode, selection.selected, selection.hovered);

        this.onClick = this.wrapFunction(this.onClick);
        this.onHover = this.wrapFunction(this.onHover);
        this.onBoxHover = this.wrapFunction(this.onBoxHover);
        this.onBoxSelect = this.wrapFunction(this.onBoxSelect);
        this.onCreatorSelect = this.wrapFunction(this.onCreatorSelect);
    }

    private onIntersection(intersections: Intersection[], strategy: SelectionStrategy, modifier: ChangeSelectionModifier): Intersection | undefined {
        if (intersections.length == 0) {
            strategy.emptyIntersection(modifier);
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                if (strategy.solid(object, modifier)) return intersection;
                if (strategy.topologicalItem(object, modifier)) return intersection;
            } else if (object instanceof Curve3D) {
                if (strategy.curve3D(object, modifier)) return intersection;
            } else if (object instanceof Region) {
                if (strategy.region(object, modifier)) return intersection;
            } else if (object instanceof ControlPoint) {
                if (strategy.controlPoint(object, modifier)) return intersection;
            } else {
                console.error(object);
                throw new Error("Invalid precondition");
            }
        }

        strategy.emptyIntersection(modifier);
        return;
    }

    onClick(intersections: Intersection[], modifier: ChangeSelectionModifier): Intersection | undefined {
        return this.onIntersection(intersections, this.clickStrategy, modifier);
    }

    onHover(intersections: Intersection[], modifier: ChangeSelectionModifier): void {
        this.onIntersection(intersections, this.hoverStrategy, modifier);
    }

    onBoxHover(hover: Set<Intersectable>, modifier: ChangeSelectionModifier) {
        this.hoverStrategy.box(hover, modifier);
    }

    onBoxSelect(select: Set<Intersectable>, modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(select, modifier);
    }

    onCreatorSelect(topologyItems: visual.TopologyItem[], modifier: ChangeSelectionModifier) {
        for (const topo of topologyItems) {
            if (!this.clickStrategy.solid(topo, modifier))
                this.clickStrategy.topologicalItem(topo, modifier);
        }
    }

    private aggregateHovers<R>(f: () => R): R {
        const { signals } = this;
        const added = new Set<Selectable>(), removed = new Set<Selectable>();
        const add = (s: Selectable) => added.add(s);
        const remove = (s: Selectable) => removed.add(s);
        signals.objectHovered.add(add);
        signals.objectUnhovered.add(remove);
        let result: R;
        try { result = f() }
        finally {
            signals.objectHovered.remove(add);
            signals.objectUnhovered.remove(remove);
        }
        this.signals.hoverChanged.dispatch({ added, removed });
        return result;
    }

    private wrapFunction<A extends any[], R>(f: (...args: A) => R): (...args: A) => R {
        return (...args: A): R => this.aggregateHovers(() => f.call(this, ...args));
    }
}
