import { EditorSignals } from '../editor/EditorSignals';
import MaterialDatabase from '../editor/MaterialDatabase';
import { Intersectable, Intersection } from "../editor/Intersectable";
import * as visual from '../editor/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from '../editor/VisualModel';
import { ClickStrategy } from './Click';
import { HoverStrategy } from './Hover';
import { HasSelectedAndHovered } from './SelectionManager';

export enum SelectionMode {
    CurveEdge, Face, Solid, Curve, ControlPoint
}

export interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: Curve3D, parentItem: SpaceInstance<Curve3D>): boolean;
    region(object: Region, parentItem: PlaneInstance<Region>): boolean;
    controlPoint(object: ControlPoint, parentItem: SpaceInstance<Curve3D>): boolean;
}

export class SelectionInteractionManager {
    private readonly clickStrategy: ClickStrategy;
    private readonly hoverStrategy: HoverStrategy;

    constructor(
        readonly selection: HasSelectedAndHovered,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        this.clickStrategy = new ClickStrategy(selection.mode, selection.selected, selection.hovered);
        this.hoverStrategy = new HoverStrategy(selection.mode, selection.selected, selection.hovered);
    }

    private onIntersection(intersections: Intersectable[], strategy: SelectionStrategy): Intersectable | undefined {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        for (const intersection of intersections) {
            if (intersection instanceof Face || intersection instanceof CurveEdge) {
                const parentItem = intersection.parentItem;
                if (strategy.solid(intersection, parentItem)) return intersection;
                if (strategy.topologicalItem(intersection, parentItem)) return intersection;
            } else if (intersection instanceof Curve3D) {
                const parentItem = intersection.parentItem;
                if (strategy.curve3D(intersection, parentItem)) return intersection;
            } else if (intersection instanceof Region) {
                const parentItem = intersection.parentItem;
                if (strategy.region(intersection, parentItem)) return intersection;
            } else if (intersection instanceof ControlPoint) {
                const parentItem = intersection.parentItem;
                if (strategy.controlPoint(intersection, parentItem)) return intersection;
            } else {
                console.error(intersection);
                throw new Error("Invalid precondition");
            }
        }

        strategy.emptyIntersection();
        return;
    }

    onClick(intersections: Intersectable[]): Intersectable | undefined {
        return this.onIntersection(intersections, this.clickStrategy);
    }

    onHover(intersections: Intersectable[]): void {
        this.onIntersection(intersections, this.hoverStrategy);
    }

    onBoxHover(hover: Set<Intersectable>) {
        this.hoverStrategy.box(hover);
    }

    onBoxSelect(select: Set<Intersectable>) {
        this.clickStrategy.box(select);
    }

    onCreatorSelect(topologyItems: visual.TopologyItem[]) {
        for (const topo of topologyItems) {
            if (!this.clickStrategy.solid(topo, topo.parentItem))
                this.clickStrategy.topologicalItem(topo, topo.parentItem);
        }
    }
}
