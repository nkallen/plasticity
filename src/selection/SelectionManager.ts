import { Disposable } from 'event-kit';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import { Clone, SelectionMemento, StateChange } from '../History';
import MaterialDatabase from '../MaterialDatabase';
import { RefCounter } from '../util/Util';
import * as visual from '../VisualModel';
import { Curve3D, CurveEdge, CurveSegment, Face, Solid, SpaceInstance, TopologyItem } from '../VisualModel';
import { ClickStrategy } from './Click';
import { Hoverable, HoverStrategy } from './Hover';

export enum SelectionMode {
    Edge, Face, Solid, Curve
}

export interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: CurveSegment, parentItem: SpaceInstance<Curve3D>): boolean;
    invalidIntersection(): void;
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

        signals.clicked.add((intersections) => this.onClick(intersections));
        signals.hovered.add((intersections) => this.onPointerMove(intersections));
    }

    private onIntersection(intersections: THREE.Intersection[], strategy: SelectionStrategy) {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        // FIXME add sort order in visualmodel rather than adhoc here
        intersections.sort((i1, i2) => {
            const a = i1.object, b = i2.object;
            if (a instanceof visual.CurveEdge && b instanceof visual.Face) {
                return -1;
            } else if (a instanceof visual.Face && b instanceof visual.CurveEdge) {
                return 1;
            } else {
                return 0;
            }
        });

        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.selection.mode.has(SelectionMode.Solid)) {
                    if (strategy.solid(object, parentItem as Solid)) return;
                }
                if (strategy.topologicalItem(object, parentItem as Solid)) return;
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (strategy.curve3D(object, parentItem)) return;
            }
        }
    }

    onClick(intersections: THREE.Intersection[]): void {
        this.onIntersection(intersections, this.clickStrategy);
    }

    onPointerMove(intersections: THREE.Intersection[]): void {
        this.onIntersection(intersections, this.hoverStrategy);
    }

}

export interface HasSelection {
    readonly mode: Set<SelectionMode>;
    readonly selectedSolids: Set<Solid>;
    readonly selectedEdges: Set<CurveEdge>;
    readonly selectedFaces: Set<Face>;
    readonly selectedCurves: Set<SpaceInstance<Curve3D>>;
    hover?: Hoverable;
    readonly selectedChildren: RefCounter<visual.SpaceItem>;
}

export class SelectionManager implements HasSelection {
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face]);

    readonly selectedSolids = new Set<Solid>();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<SpaceInstance<Curve3D>>();

    // selectedChildren is the set of solids that have actively selected topological items;
    // It's used in selection logic -- you can't select a solid if its face is already selected, for instance;
    // Further, when you delete a solid, if it has any selected faces, you need to unselect those faces as well.
    readonly selectedChildren = new RefCounter<visual.SpaceItem>();

    hover?: Hoverable = undefined;

    constructor(
        readonly db: GeometryDatabase,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals
    ) {
        signals.objectRemoved.add(item => this.delete(item));
    }

    deselectFace(object: Face, parentItem: Solid) {
        const model = this.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        this.selectedFaces.delete(object);
        object.material = this.materials.lookup(model);
        this.selectedChildren.decr(parentItem);
        this.signals.objectDeselected.dispatch(object);
    }

    selectFace(object: Face, parentItem: Solid) {
        const model = this.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedFaces.add(object);
        object.material = this.materials.highlight(model);
        this.selectedChildren.incr(parentItem,
            new Disposable(() => this.selectedFaces.delete(object)));
        this.signals.objectSelected.dispatch(object);
    }

    deselectEdge(object: CurveEdge, parentItem: Solid) {
        const model = this.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        this.selectedEdges.delete(object);
        object.material = this.materials.lookup(model);
        this.selectedChildren.decr(parentItem);
        this.signals.objectDeselected.dispatch(object);
    }

    selectEdge(object: CurveEdge, parentItem: Solid) {
        const model = this.db.lookupTopologyItem(object) as c3d.CurveEdge; // FIXME it would be better to not lookup anything
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedEdges.add(object);
        object.material = this.materials.highlight(model);
        this.selectedChildren.incr(parentItem,
            new Disposable(() => this.selectedEdges.delete(object)));
        this.signals.objectSelected.dispatch(object);
    }

    deselectSolid(solid: Solid) {
        this.selectedSolids.delete(solid);
        this.signals.objectDeselected.dispatch(solid);
    }

    selectSolid(solid: Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedSolids.add(solid);
        this.signals.objectSelected.dispatch(solid);
    }

    deselectCurve(curve: SpaceInstance<Curve3D>) {
        const model = this.db.lookup(curve);
        this.selectedCurves.delete(curve);
        curve.material = this.materials.line(model);
        this.signals.objectDeselected.dispatch(curve);
    }

    selectCurve(curve: SpaceInstance<Curve3D>) {
        const model = this.db.lookup(curve);
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedCurves.add(curve);
        curve.material = this.materials.highlight(model);
        this.signals.objectSelected.dispatch(curve);
    }

    deselectAll(): void {
        for (const object of this.selectedEdges) {
            this.selectedEdges.delete(object);
            const model = this.db.lookupTopologyItem(object);
            object.material = this.materials.lookup(model);
            this.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedFaces) {
            this.selectedFaces.delete(object);
            const model = this.db.lookupTopologyItem(object);
            object.material = this.materials.lookup(model);
            this.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedSolids) {
            this.selectedSolids.delete(object);
            this.signals.objectDeselected.dispatch(object);
        }
        for (const curve of this.selectedCurves) {
            this.selectedCurves.delete(curve);
            const model = this.db.lookup(curve);
            curve.material = this.materials.line(model);
            this.signals.objectDeselected.dispatch(curve);
        }
        this.selectedChildren.clear();
    }

    delete(item: visual.SpaceItem): void {
        if (item instanceof visual.Solid) {
            this.selectedSolids.delete(item);
            this.selectedChildren.delete(item);
            this.signals.objectDeselected.dispatch(item);
        } else if (item instanceof visual.SpaceInstance) {
            this.selectedCurves.delete(item);
            this.signals.objectDeselected.dispatch(item);
        }
    }
}

export class UndoableSelectionManager extends SelectionManager {
    constructor(
        db: GeometryDatabase,
        materials: MaterialDatabase,
        signals: EditorSignals,
        readonly stateChange: StateChange
    ) { 
        super(db, materials, signals);
    }

    deselectFace(object: Face, parentItem: Solid) {
        this.stateChange(() => super.deselectFace(object, parentItem));
    }
    selectFace(object: Face, parentItem: Solid) {
        this.stateChange(() => super.selectFace(object, parentItem));
    }
    deselectEdge(object: CurveEdge, parentItem: Solid) {
        this.stateChange(() => super.deselectEdge(object, parentItem));
    }
    selectEdge(object: CurveEdge, parentItem: Solid) {
        this.stateChange(() => super.selectEdge(object, parentItem));
    }
    deselectSolid(solid: Solid) {
        this.stateChange(() => super.deselectSolid(solid));
    }
    selectSolid(solid: Solid) {
        this.stateChange(() => super.selectSolid(solid));
    }
    deselectCurve(curve: SpaceInstance<Curve3D>) {
        this.stateChange(() => super.deselectCurve(curve));
    }
    selectCurve(curve: SpaceInstance<Curve3D>) {
        this.stateChange(() => super.selectCurve(curve));
    }
    deselectAll(): void {
        this.stateChange(() => super.deselectAll());
    }

    saveToMemento(registry: Map<any, any>) {
        return new SelectionMemento(
            Clone(this.selectedSolids, registry),
            Clone(this.selectedChildren, registry),
            Clone(this.selectedEdges, registry),
            Clone(this.selectedFaces, registry),
            Clone(this.selectedCurves, registry),
        );
    }

    restoreFromMemento(m: SelectionMemento) {
        (this.selectedSolids as SelectionManager['selectedSolids']) = m.selectedSolids;
        (this.selectedChildren as SelectionManager['selectedChildren']) = m.selectedChildren;
        (this.selectedEdges as SelectionManager['selectedEdges']) = m.selectedEdges;
        (this.selectedFaces as SelectionManager['selectedFaces']) = m.selectedFaces;
        (this.selectedCurves as SelectionManager['selectedCurves']) = m.selectedCurves;
    }
}