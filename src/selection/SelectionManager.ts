import signals from 'signals';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import { SelectionMemento } from '../editor/History';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as visual from '../editor/VisualModel';
import { assertUnreachable, RefCounter } from '../util/Util';
import { HighlightManager } from './HighlightManager';
import { ControlPointSelection, ItemSelection, TopologyItemSelection } from './Selection';
import { SelectionMode } from './SelectionInteraction';

export interface HasSelection {
    readonly mode: ReadonlySet<SelectionMode>;
    readonly solids: ItemSelection<visual.Solid>;
    readonly edges: TopologyItemSelection<visual.CurveEdge>;
    readonly faces: TopologyItemSelection<visual.Face>;
    readonly regions: ItemSelection<visual.PlaneInstance<visual.Region>>;
    readonly curves: ItemSelection<visual.SpaceInstance<visual.Curve3D>>;
    readonly controlPoints: ControlPointSelection;
    hasSelectedChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>): boolean;
    deselectChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>): void;

    readonly solidIds: ReadonlySet<c3d.SimpleName>;
    readonly edgeIds: ReadonlySet<string>;
    readonly faceIds: ReadonlySet<string>;
    readonly regionIds: ReadonlySet<c3d.SimpleName>;
    readonly curveIds: ReadonlySet<c3d.SimpleName>;
    readonly controlPointIds: ReadonlySet<string>;
}

export interface ModifiesSelection extends HasSelection {
    removeFace(object: visual.Face, parentItem: visual.Solid): void;
    addFace(object: visual.Face, parentItem: visual.Solid): void;

    removeRegion(object: visual.PlaneInstance<visual.Region>): void;
    addRegion(object: visual.PlaneInstance<visual.Region>): void;

    removeEdge(object: visual.CurveEdge, parentItem: visual.Solid): void;
    addEdge(object: visual.CurveEdge, parentItem: visual.Solid): void;

    removeSolid(solid: visual.Solid): void;
    addSolid(solid: visual.Solid): void;

    removeCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;
    addCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;

    removeControlPoint(index: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>): void;
    addControlPoint(index: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>): void;

    removeAll(): void;
}

interface SignalLike {
    objectRemovedFromDatabase: signals.Signal<visual.Item>;
    objectAdded: signals.Signal<visual.Selectable>;
    objectRemoved: signals.Signal<visual.Selectable>;
    selectionChanged: signals.Signal<{ selection: HasSelection, point?: THREE.Vector3 }>;
}

export class Selection implements HasSelection, ModifiesSelection {
    readonly solidIds = new Set<c3d.SimpleName>();
    readonly edgeIds = new Set<string>();
    readonly faceIds = new Set<string>();
    readonly regionIds = new Set<c3d.SimpleName>();
    readonly curveIds = new Set<c3d.SimpleName>();
    readonly controlPointIds = new Set<string>();

    // selectedChildren is the set of solids that have actively selected topological items;
    // It's used in selection logic -- you can't select a solid if its face is already selected, for instance;
    // Further, when you delete a solid, if it has any selected faces, you need to unselect those faces as well.
    private readonly parentsWithSelectedChildren = new RefCounter<c3d.SimpleName>();

    constructor(
        readonly db: GeometryDatabase,
        readonly materials: MaterialDatabase,
        readonly signals: SignalLike,
        readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face, SelectionMode.ControlPoint])
    ) {
        signals.objectRemovedFromDatabase.add(item => this.delete(item));
    }

    get solids() { return new ItemSelection<visual.Solid>(this.db, this.solidIds) }
    get edges() { return new TopologyItemSelection<visual.CurveEdge>(this.db, this.edgeIds) }
    get faces() { return new TopologyItemSelection<visual.Face>(this.db, this.faceIds) }
    get regions() { return new ItemSelection<visual.PlaneInstance<visual.Region>>(this.db, this.regionIds) }
    get curves() { return new ItemSelection<visual.SpaceInstance<visual.Curve3D>>(this.db, this.curveIds) }
    get controlPoints() { return new ControlPointSelection(this.db, this.controlPointIds) }

    hasSelectedChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>) {
        return this.parentsWithSelectedChildren.has(solid.simpleName)
    }

    deselectChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>) {
        return this.parentsWithSelectedChildren.delete(solid.simpleName)
    }

    add(items: visual.Item | visual.Item[]) {
        if (items instanceof visual.Item) items = [items];
        for (const item of items) {
            if (item instanceof visual.Solid) {
                this.addSolid(item);
            } else if (item instanceof visual.SpaceInstance) {
                this.addCurve(item);
            } else if (item instanceof visual.PlaneInstance) {
                this.addRegion(item);
            } else throw new Error("invalid type");
        }
    }

    removeFace(object: visual.Face, parentItem: visual.Solid) {
        this.faceIds.delete(object.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectRemoved.dispatch(object);
    }

    addFace(object: visual.Face, parentItem: visual.Solid) {
        this.faceIds.add(object.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            () => this.faceIds.delete(object.simpleName));
        this.signals.objectAdded.dispatch(object);
    }

    removeRegion(object: visual.PlaneInstance<visual.Region>) {
        this.regionIds.delete(object.simpleName);
        this.signals.objectRemoved.dispatch(object);
    }

    addRegion(object: visual.PlaneInstance<visual.Region>) {
        this.regionIds.add(object.simpleName);
        this.signals.objectAdded.dispatch(object);
    }

    removeEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        this.edgeIds.delete(object.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectRemoved.dispatch(object);
    }

    addEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        this.edgeIds.add(object.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            () => this.edgeIds.delete(object.simpleName)
        );
        this.signals.objectAdded.dispatch(object);
    }

    removeSolid(solid: visual.Solid) {
        this.solidIds.delete(solid.simpleName);
        this.signals.objectRemoved.dispatch(solid);
    }

    addSolid(solid: visual.Solid) {
        this.solidIds.add(solid.simpleName);
        this.signals.objectAdded.dispatch(solid);
    }
    
    removeCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this.curveIds.delete(curve.simpleName);
        this.signals.objectRemoved.dispatch(curve);
    }

    addCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this.curveIds.add(curve.simpleName);
        this.signals.objectAdded.dispatch(curve);
    }

    addControlPoint(point: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>) {
        this.controlPointIds.add(point.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            () => this.controlPointIds.delete(point.simpleName));
        this.signals.objectAdded.dispatch(point);
    }

    removeControlPoint(point: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>) {
        this.controlPointIds.delete(point.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectRemoved.dispatch(point);
    }
    
    removeAll(): void {
        for (const collection of [this.edgeIds, this.faceIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { views } = this.db.lookupTopologyItemById(id);
                this.signals.objectRemoved.dispatch(views.entries().next().value);
            }
        }
        for (const collection of [this.solidIds, this.curveIds, this.regionIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { view } = this.db.lookupItemById(id);
                this.signals.objectRemoved.dispatch(view);
            }
        }
        for (const id of this.controlPointIds) {
            this.controlPointIds.delete(id);
            const { views } = this.db.lookupControlPointById(id);
            this.signals.objectRemoved.dispatch(views.entries().next().value);
        }
        this.parentsWithSelectedChildren.clear();
    }

    delete(item: visual.Item) {
        if (item instanceof visual.Solid) {
            this.solidIds.delete(item.simpleName);
            this.parentsWithSelectedChildren.delete(item.simpleName);
        } else if (item instanceof visual.SpaceInstance) {
            this.curveIds.delete(item.simpleName);
            this.parentsWithSelectedChildren.delete(item.simpleName);
        } else if (item instanceof visual.PlaneInstance) {
            this.regionIds.delete(item.simpleName);
        } else throw new Error("invalid precondition");
        this.signals.objectRemoved.dispatch(item);
    }

    saveToMemento(registry: Map<any, any>) {
        return new SelectionMemento(
            new Set(this.solidIds),
            new RefCounter(this.parentsWithSelectedChildren),
            new Set(this.edgeIds),
            new Set(this.faceIds),
            new Set(this.curveIds),
            new Set(this.regionIds),
            new Set(this.controlPointIds),
        );
    }

    restoreFromMemento(m: SelectionMemento) {
        (this.solidIds as Selection['solidIds']) = m.selectedSolidIds;
        (this.parentsWithSelectedChildren as Selection['parentsWithSelectedChildren']) = m.parentsWithSelectedChildren;
        (this.edgeIds as Selection['edgeIds']) = m.selectedEdgeIds;
        (this.faceIds as Selection['faceIds']) = m.selectedFaceIds;
        (this.curveIds as Selection['curveIds']) = m.selectedCurveIds;
        (this.regionIds as Selection['regionIds']) = m.selectedRegionIds;
        (this.controlPointIds as Selection['controlPointIds']) = m.selectedControlPointIds;

        this.signals.selectionChanged.dispatch({ selection: this });
    }
}

export interface HasSelectedAndHovered {
    readonly selected: Selection;
    readonly hovered: Selection;
}

export class SelectionManager implements HasSelectedAndHovered {
    private readonly selectedSignals: SignalLike = {
        objectRemovedFromDatabase: this.signals.objectRemoved,
        objectAdded: this.signals.objectSelected,
        objectRemoved: this.signals.objectDeselected,
        selectionChanged: this.signals.selectionChanged
    }
    private readonly hoveredSignals: SignalLike = {
        objectRemovedFromDatabase: this.signals.objectRemoved,
        objectAdded: this.signals.objectHovered,
        objectRemoved: this.signals.objectUnhovered,
        selectionChanged: this.signals.selectionChanged
    }
    readonly selected = new Selection(this.db, this.materials, this.selectedSignals, this.mode);
    readonly hovered = new Selection(this.db, this.materials, this.hoveredSignals, this.mode);
    private readonly highlighter = new HighlightManager(this.db);

    constructor(
        readonly db: GeometryDatabase,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals,
        readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face, SelectionMode.ControlPoint])
    ) { }

    highlight() {
        this.highlightSelection(this.selected, this.materials.highlight);
        this.highlightSelection(this.hovered, this.materials.hover);
    }

    unhighlight() {
        this.unhighlightSelection(this.selected);
        this.unhighlightSelection(this.hovered);
    }

    private highlightSelection(selection: HasSelection, fn: MaterialDatabase['highlight'] | MaterialDatabase['hover']) {
        const { edgeIds, faceIds, curveIds, regionIds, controlPointIds } = selection;
        for (const collection of [edgeIds, faceIds]) {
            this.highlighter.highlightTopologyItems(collection, m => fn(m));
        }
        for (const collection of [curveIds, regionIds]) {
            this.highlighter.highlightItems(collection, m => fn(m));
        }

        this.highlighter.highlightControlPoints(controlPointIds, m => fn(m));
    }

    private unhighlightSelection(selection: HasSelection) {
        const { edgeIds, faceIds, curveIds, regionIds, controlPointIds } = selection;
        for (const collection of [edgeIds, faceIds]) {
            this.highlighter.unhighlightTopologyItems(collection);
        }
        for (const collection of [curveIds, regionIds]) {
            this.highlighter.unhighlightItems(collection);
        }
        this.highlighter.unhighlightControlPoints(controlPointIds);
    }
}