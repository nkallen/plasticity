import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../editor/EditorSignals';
import { GeometryDatabase } from '../editor/GeometryDatabase';
import { SelectionMemento } from '../editor/History';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as visual from '../editor/VisualModel';
import { RefCounter } from '../util/Util';
import { HighlightManager } from './HighlightManager';
import { Hoverable } from './Hover';
import { ControlPointSelection, ItemSelection, TopologyItemSelection } from './Selection';
import { SelectionMode } from './SelectionInteraction';

export interface HasSelection {
    readonly mode: ReadonlySet<SelectionMode>;
    readonly selectedSolids: ItemSelection<visual.Solid>;
    readonly selectedEdges: TopologyItemSelection<visual.CurveEdge>;
    readonly selectedFaces: TopologyItemSelection<visual.Face>;
    readonly selectedRegions: ItemSelection<visual.PlaneInstance<visual.Region>>;
    readonly selectedCurves: ItemSelection<visual.SpaceInstance<visual.Curve3D>>;
    readonly selectedControlPoints: ControlPointSelection;
    hover?: Hoverable;
    hasSelectedChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>): boolean;
    deselectChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>): void;
}

export interface ModifiesSelection extends HasSelection {
    deselectFace(object: visual.Face, parentItem: visual.Solid): void;
    selectFace(object: visual.Face, parentItem: visual.Solid): void;
    deselectRegion(object: visual.PlaneInstance<visual.Region>): void;
    selectRegion(object: visual.PlaneInstance<visual.Region>): void;
    deselectEdge(object: visual.CurveEdge, parentItem: visual.Solid): void;
    selectEdge(object: visual.CurveEdge, parentItem: visual.Solid): void;
    deselectSolid(solid: visual.Solid): void;
    selectSolid(solid: visual.Solid): void;
    deselectCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;
    selectCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;
    deselectControlPoint(index: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>): void;
    selectControlPoint(index: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>): void;
    deselectAll(): void;
}

export class SelectionManager implements HasSelection, ModifiesSelection {
    readonly selectedSolidIds = new Set<c3d.SimpleName>();
    readonly selectedEdgeIds = new Set<string>();
    readonly selectedFaceIds = new Set<string>();
    readonly selectedRegionIds = new Set<c3d.SimpleName>();
    readonly selectedCurveIds = new Set<c3d.SimpleName>();
    readonly selectedControlPointIds = new Set<string>();

    // selectedChildren is the set of solids that have actively selected topological items;
    // It's used in selection logic -- you can't select a solid if its face is already selected, for instance;
    // Further, when you delete a solid, if it has any selected faces, you need to unselect those faces as well.
    private readonly parentsWithSelectedChildren = new RefCounter<c3d.SimpleName>();

    hover?: Hoverable = undefined;
    private readonly highlighter = new HighlightManager(this.db);

    constructor(
        readonly db: GeometryDatabase,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals,
        readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face, SelectionMode.ControlPoint])
    ) {
        signals.objectRemoved.add(item => this.delete(item));
    }

    get selectedSolids() {
        return new ItemSelection<visual.Solid>(this.db, this.selectedSolidIds);
    }

    get selectedEdges() {
        return new TopologyItemSelection<visual.CurveEdge>(this.db, this.selectedEdgeIds);
    }

    get selectedFaces() {
        return new TopologyItemSelection<visual.Face>(this.db, this.selectedFaceIds);
    }

    get selectedRegions() {
        return new ItemSelection<visual.PlaneInstance<visual.Region>>(this.db, this.selectedRegionIds);
    }

    get selectedCurves() {
        return new ItemSelection<visual.SpaceInstance<visual.Curve3D>>(this.db, this.selectedCurveIds);
    }

    get selectedControlPoints() {
        return new ControlPointSelection(this.db, this.selectedControlPointIds);
    }

    hasSelectedChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>) {
        return this.parentsWithSelectedChildren.has(solid.simpleName);
    }

    deselectChildren(solid: visual.Solid | visual.SpaceInstance<visual.Curve3D>) {
        return this.parentsWithSelectedChildren.delete(solid.simpleName);
    }

    deselectFace(object: visual.Face, parentItem: visual.Solid) {
        this.selectedFaceIds.delete(object.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectDeselected.dispatch(object);
    }

    selectFace(object: visual.Face, parentItem: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedFaceIds.add(object.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            () => this.selectedFaceIds.delete(object.simpleName));
        this.signals.objectSelected.dispatch(object);
    }

    deselectRegion(object: visual.PlaneInstance<visual.Region>) {
        this.selectedRegionIds.delete(object.simpleName);
        this.signals.objectDeselected.dispatch(object);
    }

    selectRegion(object: visual.PlaneInstance<visual.Region>) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedRegionIds.add(object.simpleName);
        this.signals.objectSelected.dispatch(object);
    }

    deselectEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        this.selectedEdgeIds.delete(object.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectDeselected.dispatch(object);
    }

    selectEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedEdgeIds.add(object.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            () => this.selectedEdgeIds.delete(object.simpleName)
        );
        this.signals.objectSelected.dispatch(object);
    }

    deselectSolid(solid: visual.Solid) {
        this.selectedSolidIds.delete(solid.simpleName);
        this.signals.objectDeselected.dispatch(solid);
    }

    selectSolid(solid: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedSolidIds.add(solid.simpleName);
        this.signals.objectSelected.dispatch(solid);
    }

    deselectCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this.selectedCurveIds.delete(curve.simpleName);
        this.signals.objectDeselected.dispatch(curve);
    }

    selectCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedCurveIds.add(curve.simpleName);
        this.signals.objectSelected.dispatch(curve);
    }

    selectControlPoint(point: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedControlPointIds.add(point.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            () => this.selectedControlPointIds.delete(point.simpleName));
        this.signals.objectSelected.dispatch(point);
    }

    deselectControlPoint(point: visual.ControlPoint, parentItem: visual.SpaceInstance<visual.Curve3D>) {
        this.selectedControlPointIds.delete(point.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectDeselected.dispatch(point);
    }

    deselectAll(): void {
        for (const collection of [this.selectedEdgeIds, this.selectedFaceIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { views } = this.db.lookupTopologyItemById(id);
                this.signals.objectDeselected.dispatch(views.entries().next().value);
            }
        }
        for (const collection of [this.selectedSolidIds, this.selectedCurveIds, this.selectedRegionIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { view } = this.db.lookupItemById(id);
                this.signals.objectDeselected.dispatch(view);
            }
        }
        for (const id of this.selectedControlPointIds) {
            this.selectedControlPointIds.delete(id);
            const { views } = this.db.lookupControlPointById(id);
            this.signals.objectDeselected.dispatch(views.entries().next().value);
        }
        this.parentsWithSelectedChildren.clear();
    }

    delete(item: visual.Item) {
        if (item instanceof visual.Solid) {
            this.selectedSolidIds.delete(item.simpleName);
            this.parentsWithSelectedChildren.delete(item.simpleName);
        } else if (item instanceof visual.SpaceInstance) {
            this.selectedCurveIds.delete(item.simpleName);
            this.parentsWithSelectedChildren.delete(item.simpleName);
        } else if (item instanceof visual.PlaneInstance) {
            this.selectedRegionIds.delete(item.simpleName);
        } else throw new Error("invalid precondition");
        this.hover?.dispose();
        this.hover = undefined;
        this.signals.objectDeselected.dispatch(item);
    }

    highlight() {
        const { selectedEdgeIds, selectedFaceIds, selectedCurveIds, selectedRegionIds, selectedControlPointIds } = this;
        for (const collection of [selectedEdgeIds, selectedFaceIds]) {
            this.highlighter.highlightTopologyItems(collection, m => this.materials.highlight(m));
        }
        for (const collection of [selectedCurveIds, selectedRegionIds]) {
            this.highlighter.highlightItems(collection, m => this.materials.highlight(m));
        }

        this.highlighter.highlightControlPoints(selectedControlPointIds, m => this.materials.highlight(m));
        this.hover?.highlight(this.highlighter);
    }

    unhighlight() {
        this.hover?.unhighlight(this.highlighter);
        const { selectedEdgeIds, selectedFaceIds, selectedCurveIds, selectedRegionIds, selectedControlPointIds } = this;
        for (const collection of [selectedEdgeIds, selectedFaceIds]) {
            this.highlighter.unhighlightTopologyItems(collection);
        }
        for (const collection of [selectedCurveIds, selectedRegionIds]) {
            this.highlighter.unhighlightItems(collection);
        }
        this.highlighter.unhighlightControlPoints(selectedControlPointIds);
    }

    saveToMemento(registry: Map<any, any>) {
        return new SelectionMemento(
            new Set(this.selectedSolidIds),
            new RefCounter(this.parentsWithSelectedChildren),
            new Set(this.selectedEdgeIds),
            new Set(this.selectedFaceIds),
            new Set(this.selectedCurveIds),
            new Set(this.selectedRegionIds),
            new Set(this.selectedControlPointIds),
        );
    }

    restoreFromMemento(m: SelectionMemento) {
        (this.selectedSolidIds as SelectionManager['selectedSolidIds']) = m.selectedSolidIds;
        (this.parentsWithSelectedChildren as SelectionManager['parentsWithSelectedChildren']) = m.parentsWithSelectedChildren;
        (this.selectedEdgeIds as SelectionManager['selectedEdgeIds']) = m.selectedEdgeIds;
        (this.selectedFaceIds as SelectionManager['selectedFaceIds']) = m.selectedFaceIds;
        (this.selectedCurveIds as SelectionManager['selectedCurveIds']) = m.selectedCurveIds;
        (this.selectedRegionIds as SelectionManager['selectedRegionIds']) = m.selectedRegionIds;
        (this.selectedControlPointIds as SelectionManager['selectedControlPointIds']) = m.selectedControlPointIds;

        this.signals.selectionChanged.dispatch({ selection: this });
    }
}