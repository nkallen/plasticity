import { EditorSignals } from '../editor/EditorSignals';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as visual from '../editor/VisualModel';
import { ControlPoint, Curve3D, CurveEdge, Face, PlaneInstance, Region, Solid, SpaceInstance, TopologyItem } from '../editor/VisualModel';
import { ClickStrategy } from './Click';
import { HoverStrategy } from './Hover';
import { SelectionManager } from './SelectionManager';
import * as THREE from "three";

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
        readonly selection: SelectionManager,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        this.clickStrategy = new ClickStrategy(selection);
        this.hoverStrategy = new HoverStrategy(selection, materials, signals);
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
                if (this.selection.mode.has(SelectionMode.Solid)) {
                    if (strategy.solid(object, parentItem as Solid)) return intersection;
                }
                if (strategy.topologicalItem(object, parentItem as Solid)) return intersection;
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
    }

    onClick(intersections: THREE.Intersection[]): THREE.Intersection | undefined {
        return this.onIntersection(intersections, this.clickStrategy);
    }

    onHover(intersections: THREE.Intersection[]): void {
        this.onIntersection(intersections, this.hoverStrategy);
    }
}

const map = new Map<any, number>();
map.set(visual.ControlPoint, 1);
map.set(visual.CurveEdge, 2);
map.set(visual.Face, 3);
map.set(visual.Curve3D, 3);
map.set(visual.Region, 3);

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