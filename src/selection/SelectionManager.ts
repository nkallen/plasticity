import { Disposable } from 'event-kit';
import c3d from '../build/Release/c3d.node';
import { EditorSignals } from '../Editor';
import { GeometryDatabase } from '../GeometryDatabase';
import { Clone, SelectionMemento } from '../History';
import MaterialDatabase from '../MaterialDatabase';
import { RefCounter } from '../util/Util';
import * as visual from '../VisualModel';
import { Hoverable } from './Hover';
import { SelectionMode } from './SelectionInteraction';

export interface HasSelection {
    readonly mode: ReadonlySet<SelectionMode>;
    readonly selectedSolids: ReadonlySet<visual.Solid>;
    readonly selectedEdges: ReadonlySet<visual.CurveEdge>;
    readonly selectedFaces: ReadonlySet<visual.Face>;
    readonly selectedRegions: ReadonlySet<visual.PlaneInstance<visual.Region>>;
    readonly selectedCurves: ReadonlySet<visual.SpaceInstance<visual.Curve3D>>;
    hover?: Hoverable;
    readonly selectedChildren: RefCounter<visual.SpaceItem>;
}

export interface ModifiesSelection {
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
    deselectAll(): void;
}

export class SelectionManager implements HasSelection, ModifiesSelection {
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve, SelectionMode.Face]);

    readonly selectedSolids = new Set<visual.Solid>();
    readonly selectedEdges = new Set<visual.CurveEdge>();
    readonly selectedFaces = new Set<visual.Face>();
    readonly selectedRegions = new Set<visual.PlaneInstance<visual.Region>>();
    readonly selectedCurves = new Set<visual.SpaceInstance<visual.Curve3D>>();

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

    deselectFace(object: visual.Face, parentItem: visual.Solid) {
        const model = this.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        this.selectedFaces.delete(object);
        object.material = this.materials.lookup(model);
        this.selectedChildren.decr(parentItem);
        this.signals.objectDeselected.dispatch(object);
    }

    selectFace(object: visual.Face, parentItem: visual.Solid) {
        const model = this.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedFaces.add(object);
        object.material = this.materials.highlight(model);
        this.selectedChildren.incr(parentItem,
            new Disposable(() => this.selectedFaces.delete(object)));
        this.signals.objectSelected.dispatch(object);
    }

    deselectRegion(object: visual.PlaneInstance<visual.Region>) {
        this.selectedRegions.delete(object);
        object.material = this.materials.region();
        this.signals.objectDeselected.dispatch(object);
    }

    selectRegion(object: visual.PlaneInstance<visual.Region>) {
        const model = this.db.lookup(object);
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedRegions.add(object);
        object.material = this.materials.highlight(model);
        this.signals.objectSelected.dispatch(object);
    }

    deselectEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        const model = this.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        this.selectedEdges.delete(object);
        object.material = this.materials.lookup(model);
        this.selectedChildren.decr(parentItem);
        this.signals.objectDeselected.dispatch(object);
    }

    selectEdge(object: visual.CurveEdge, parentItem: visual.Solid) {
        const model = this.db.lookupTopologyItem(object) as c3d.CurveEdge; // FIXME it would be better to not lookup anything
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedEdges.add(object);
        object.material = this.materials.highlight(model);
        this.selectedChildren.incr(parentItem,
            new Disposable(() => this.selectedEdges.delete(object)));
        this.signals.objectSelected.dispatch(object);
    }

    deselectSolid(solid: visual.Solid) {
        this.selectedSolids.delete(solid);
        this.signals.objectDeselected.dispatch(solid);
    }

    selectSolid(solid: visual.Solid) {
        this.hover?.dispose();
        this.hover = undefined;
        this.selectedSolids.add(solid);
        this.signals.objectSelected.dispatch(solid);
    }

    deselectCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        const model = this.db.lookup(curve);
        this.selectedCurves.delete(curve);
        curve.material = this.materials.line(model);
        this.signals.objectDeselected.dispatch(curve);
    }

    selectCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
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
        for (const region of this.selectedRegions) {
            this.selectedRegions.delete(region);
            region.material = this.materials.region();
            this.signals.objectDeselected.dispatch(region);
        }
        this.selectedChildren.clear();
    }

    delete(item: visual.SpaceItem): void {
        if (item instanceof visual.Solid) {
            this.selectedSolids.delete(item);
            this.selectedChildren.delete(item);
        } else if (item instanceof visual.SpaceInstance) {
            this.selectedCurves.delete(item);
        } else if (item instanceof visual.PlaneInstance) {
            this.selectedRegions.delete(item);
        }
        this.signals.objectDeselected.dispatch(item);
    }

    saveToMemento(registry: Map<any, any>) {
        return new SelectionMemento(
            Clone(this.selectedSolids, registry),
            Clone(this.selectedChildren, registry),
            Clone(this.selectedEdges, registry),
            Clone(this.selectedFaces, registry),
            Clone(this.selectedCurves, registry),
            Clone(this.selectedRegions, registry),
        );
    }

    restoreFromMemento(m: SelectionMemento) {
        (this.selectedSolids as SelectionManager['selectedSolids']) = m.selectedSolids;
        (this.selectedChildren as SelectionManager['selectedChildren']) = m.selectedChildren;
        (this.selectedEdges as SelectionManager['selectedEdges']) = m.selectedEdges;
        (this.selectedFaces as SelectionManager['selectedFaces']) = m.selectedFaces;
        (this.selectedCurves as SelectionManager['selectedCurves']) = m.selectedCurves;
        (this.selectedRegions as SelectionManager['selectedRegions']) = m.selectedRegions;

        this.signals.selectionChanged.dispatch({ selection: this });
    }
}