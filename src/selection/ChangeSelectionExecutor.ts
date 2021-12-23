import { EditorSignals } from '../editor/EditorSignals';
import { DatabaseLike } from '../editor/GeometryDatabase';
import MaterialDatabase from '../editor/MaterialDatabase';
import { Intersectable, Intersection } from "../visual_model/Intersectable";
import * as visual from '../visual_model/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, Region } from '../visual_model/VisualModel';
import { ClickStrategy, HoverStrategy } from './Click';
import { HasSelectedAndHovered, Selectable } from './SelectionDatabase';
import { SelectionConversionStrategy } from './SelectionConversion';

export enum SelectionMode {
    CurveEdge, Face, Solid, Curve, ControlPoint
}

export const SelectionModeAll = [SelectionMode.CurveEdge, SelectionMode.Face, SelectionMode.Solid, SelectionMode.Curve, SelectionMode.ControlPoint];

export enum ChangeSelectionModifier {
    Replace, Add, Remove
}

export class ChangeSelectionExecutor {
    private readonly clickStrategy: ClickStrategy;
    private readonly hoverStrategy: ClickStrategy;
    private readonly conversionStrategy: SelectionConversionStrategy;

    constructor(
        selection: HasSelectedAndHovered,
        db: DatabaseLike,
        private readonly signals: EditorSignals,
    ) {
        this.clickStrategy = new ClickStrategy(selection.mode, selection.selected, selection.hovered, selection.selected);
        this.hoverStrategy = new HoverStrategy(selection.mode, selection.selected, selection.hovered, selection.hovered);
        this.conversionStrategy = new SelectionConversionStrategy(selection, db);

        this.onClick = this.wrapFunction(this.onClick);
        this.onHover = this.wrapFunction(this.onHover);
        this.onBoxHover = this.wrapFunction(this.onBoxHover);
        this.onBoxSelect = this.wrapFunction(this.onBoxSelect);
        this.onCreatorSelect = this.wrapFunction(this.onCreatorSelect);
        this.onConvert = this.wrapFunction(this.onConvert);
    }

    private onIntersection(intersections: Intersection[], strategy: ClickStrategy, modifier: ChangeSelectionModifier): Intersection | undefined {
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

    onBoxHover(hover: Set<Intersectable | visual.Solid>, modifier: ChangeSelectionModifier) {
        this.hoverStrategy.box(hover, modifier);
    }

    onBoxSelect(select: Set<Intersectable | visual.Solid>, modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(select, modifier);
    }

    onCreatorSelect(topologyItems: visual.TopologyItem[], modifier: ChangeSelectionModifier) {
        this.clickStrategy.box(new Set(topologyItems), modifier);
    }

    onConvert(mode: SelectionMode, modifier: ChangeSelectionModifier) {
        this.conversionStrategy.convert(mode, modifier);
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
