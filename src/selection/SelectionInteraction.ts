import * as THREE from "three";
import { EditorSignals } from '../editor/EditorSignals';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as visual from '../editor/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from '../editor/VisualModel';
import { ClickStrategy } from './Click';
import { HoverStrategy } from './Hover';
import { HasSelectedAndHovered } from './SelectionManager';

export enum SelectionMode {
    Edge, Face, Solid, Curve, ControlPoint
}

export interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: Curve3D, parentItem: SpaceInstance<Curve3D>): boolean;
    region(object: Region, parentItem: PlaneInstance<Region>): boolean;
    controlPoint(object: ControlPoint, parentItem: SpaceInstance<Curve3D>): boolean;
}

// Handles click and hovering logic
export class SelectionInteractionManager {
    private readonly clickStrategy: ClickStrategy;
    private readonly hoverStrategy: HoverStrategy;

    constructor(
        readonly selection: HasSelectedAndHovered,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        this.clickStrategy = new ClickStrategy(selection.selected, selection.hovered);
        this.hoverStrategy = new HoverStrategy(selection.selected, selection.hovered);
    }

    private onIntersection(intersections: THREE.Intersection[], strategy: SelectionStrategy): THREE.Intersection | undefined {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        intersections.sort(sortIntersections);
        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (strategy.solid(object, parentItem)) return intersection;
                if (strategy.topologicalItem(object, parentItem)) return intersection;
            } else if (object instanceof Curve3D) {
                const parentItem = object.parentItem;
                if (strategy.curve3D(object, parentItem)) return intersection;
            } else if (object instanceof Region) {
                const parentItem = object.parentItem;
                if (strategy.region(object, parentItem)) return intersection;
            } else if (object instanceof ControlPoint) {
                const parentItem = object.parentItem;
                if (strategy.controlPoint(object, parentItem)) return intersection;
            } else {
                console.error(object);
                throw new Error("Invalid precondition");
            }
        }

        strategy.emptyIntersection();
        return;
    }

    onClick(intersections: THREE.Intersection[]): THREE.Intersection | undefined {
        return this.onIntersection(intersections, this.clickStrategy);
    }

    onHover(intersections: THREE.Intersection[]): void {
        this.onIntersection(intersections, this.hoverStrategy);
    }

    onBoxHover(hover: Set<visual.Selectable>) {
        this.hoverStrategy.box(hover);
    }

    onBoxSelect(select: Set<visual.Selectable>) {
        this.clickStrategy.box(select);
    }

    onCreatorSelect(topologyItems: visual.TopologyItem[]) {
        for (const topo of topologyItems) {
            if (!this.clickStrategy.solid(topo, topo.parentItem))
                this.clickStrategy.topologicalItem(topo, topo.parentItem);
        }
    }
}

const map = new Map<any, number>();
map.set(visual.ControlPoint, 0);
map.set(visual.Curve3D, 1);
map.set(visual.CurveEdge, 2);
map.set(visual.Region, 3);
map.set(visual.Face, 4);

function sortIntersections(i1: THREE.Intersection, i2: THREE.Intersection) {
    const x = map.get(i1.object.constructor);
    const y = map.get(i2.object.constructor)
    if (x === undefined || y === undefined) {
        console.error(i1);
        console.error(i2);
        throw new Error("invalid precondition");
    }
    return x - y;
}