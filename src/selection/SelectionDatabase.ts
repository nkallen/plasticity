import { CompositeDisposable } from 'event-kit';
import signals from 'signals';
import c3d from '../../build/Release/c3d.node';
import { EditorSignals } from '../editor/EditorSignals';
import { Agent, DatabaseLike } from '../editor/GeometryDatabase';
import { MementoOriginator, SelectionMemento } from '../editor/History';
import MaterialDatabase from '../editor/MaterialDatabase';
import * as visual from '../visual_model/VisualModel';
import { Redisposable, RefCounter } from '../util/Util';
import { ControlPointSelection, ItemSelection, TopologyItemSelection } from './TypedSelection';
import { SelectionMode, SelectionModeAll } from './ChangeSelectionExecutor';

export type Selectable = visual.Item | visual.TopologyItem | visual.ControlPoint;

export interface HasSelection {
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
    add(items: visual.Item | visual.Item[]): void;
    remove(selectables: Selectable | Selectable[]): void;

    removeFace(object: visual.Face): void;
    addFace(object: visual.Face): void;

    removeRegion(object: visual.PlaneInstance<visual.Region>): void;
    addRegion(object: visual.PlaneInstance<visual.Region>): void;

    removeEdge(object: visual.CurveEdge): void;
    addEdge(object: visual.CurveEdge): void;

    removeSolid(solid: visual.Solid): void;
    addSolid(solid: visual.Solid): void;

    removeCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;
    addCurve(curve: visual.SpaceInstance<visual.Curve3D>): void;

    removeControlPoint(index: visual.ControlPoint): void;
    addControlPoint(index: visual.ControlPoint): void;

    removeAll(): void;
}

interface SignalLike {
    objectRemovedFromDatabase: signals.Signal<[visual.Item, Agent]>;
    objectAdded: signals.Signal<Selectable>;
    objectRemoved: signals.Signal<Selectable>;
    selectionChanged: signals.Signal<{ selection: HasSelection, point?: THREE.Vector3 }>;
}

export class Selection implements HasSelection, ModifiesSelection, MementoOriginator<SelectionMemento> {
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
        readonly db: DatabaseLike,
        readonly signals: SignalLike
    ) {
        signals.objectRemovedFromDatabase.add(([item,]) => this.delete(item));
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

    remove(selectables: Selectable[]) {
        if (!(selectables instanceof Array)) selectables = [selectables];

        for (const selectable of selectables) {
            if (selectable instanceof visual.Solid) {
                this.removeSolid(selectable);
            } else if (selectable instanceof visual.SpaceInstance) {
                this.removeCurve(selectable);
            } else if (selectable instanceof visual.PlaneInstance) {
                this.removeRegion(selectable);
            } else if (selectable instanceof visual.Face) {
                this.removeFace(selectable);
            } else if (selectable instanceof visual.CurveEdge) {
                this.removeEdge(selectable);
            } else if (selectable instanceof visual.ControlPoint) {
                this.removeControlPoint(selectable);
            }
        }
    }

    removeFace(object: visual.Face) {
        const id = object.simpleName;
        if (!this.faceIds.has(id)) return;
        const parentItem = object.parentItem;

        this.faceIds.delete(object.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectRemoved.dispatch(object);
    }

    addFace(object: visual.Face) {
        const id = object.simpleName;
        if (this.faceIds.has(id)) return;
        const parentItem = object.parentItem;

        this.faceIds.add(id);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            new Redisposable(() => this.faceIds.delete(id)));
        this.signals.objectAdded.dispatch(object);
    }

    removeRegion(object: visual.PlaneInstance<visual.Region>) {
        const id = object.simpleName;
        if (!this.regionIds.has(id)) return;

        this.regionIds.delete(object.simpleName);
        this.signals.objectRemoved.dispatch(object);
    }

    addRegion(object: visual.PlaneInstance<visual.Region>) {
        const id = object.simpleName;
        if (this.regionIds.has(id)) return;

        this.regionIds.add(object.simpleName);
        this.signals.objectAdded.dispatch(object);
    }

    removeEdge(object: visual.CurveEdge) {
        const id = object.simpleName;
        if (!this.edgeIds.has(id)) return;
        const parentItem = object.parentItem;

        this.edgeIds.delete(object.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectRemoved.dispatch(object);
    }

    addEdge(object: visual.CurveEdge) {
        const id = object.simpleName;
        if (this.edgeIds.has(id)) return;
        const parentItem = object.parentItem;

        this.edgeIds.add(object.simpleName);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            new Redisposable(() => this.edgeIds.delete(object.simpleName))
        );
        this.signals.objectAdded.dispatch(object);
    }

    removeSolid(solid: visual.Solid) {
        const id = solid.simpleName;
        if (!this.solidIds.has(id)) return;

        this.solidIds.delete(solid.simpleName);
        this.signals.objectRemoved.dispatch(solid);
    }

    addSolid(solid: visual.Solid) {
        const id = solid.simpleName;
        if (this.solidIds.has(id)) return;

        this.solidIds.add(solid.simpleName);
        this.signals.objectAdded.dispatch(solid);
    }

    removeCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        const id = curve.simpleName;
        if (!this.curveIds.has(id)) return;

        this.curveIds.delete(curve.simpleName);
        this.signals.objectRemoved.dispatch(curve);
    }

    addCurve(curve: visual.SpaceInstance<visual.Curve3D>) {
        const id = curve.simpleName;
        if (this.curveIds.has(id)) return;

        this.curveIds.add(id);
        this.signals.objectAdded.dispatch(curve);
    }

    addControlPoint(point: visual.ControlPoint) {
        const id = point.simpleName;
        if (this.controlPointIds.has(id)) return;
        const parentItem = point.parentItem;

        this.controlPointIds.add(id);
        this.parentsWithSelectedChildren.incr(parentItem.simpleName,
            new Redisposable(() => this.controlPointIds.delete(id)));
        this.signals.objectAdded.dispatch(point);
    }

    removeControlPoint(point: visual.ControlPoint) {
        const id = point.simpleName;
        if (!this.controlPointIds.has(id)) return;
        const parentItem = point.parentItem;

        this.controlPointIds.delete(point.simpleName);
        this.parentsWithSelectedChildren.decr(parentItem.simpleName);
        this.signals.objectRemoved.dispatch(point);
    }

    removeAll(): void {
        for (const collection of [this.edgeIds, this.faceIds]) {
            for (const id of collection) {
                collection.delete(id);
                const { views } = this.db.lookupTopologyItemById(id);
                this.signals.objectRemoved.dispatch([...views][0]);
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
            this.signals.objectRemoved.dispatch([...views][0]);
        }
        this.parentsWithSelectedChildren.clear();
    }

    clearSilently() {
        this.edgeIds.clear();
        this.faceIds.clear();
        this.solidIds.clear();
        this.curveIds.clear();
        this.regionIds.clear();
        this.controlPointIds.clear();
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

    saveToMemento() {
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

    serialize(): Promise<Buffer> {
        throw new Error('Method not implemented.');
    }
    deserialize(data: Buffer): Promise<void> {
        throw new Error('Method not implemented.');
    }

    validate() {
        for (const id of this.solidIds) {
            console.assert(this.db.lookupItemById(id) !== undefined, "solid is in database", id);
        }
        for (const id of this.faceIds) {
            console.assert(this.db.lookupTopologyItemById(id) !== undefined);
        }
        for (const id of this.edgeIds) {
            console.assert(this.db.lookupTopologyItemById(id) !== undefined);
        }
    }

    debug() { }
}

export class ToggleableSet extends Set<SelectionMode> {
    constructor(values: SelectionMode[], private readonly signals: EditorSignals) {
        super(values);
    }

    toggle(...elements: SelectionMode[]) {
        for (const element of elements) {
            if (this.has(element)) this.delete(element);
            else this.add(element);
        }
        this.signals.selectionModeChanged.dispatch(this);
    }

    set(...elements: SelectionMode[]) {
        if (eqSet(new Set(elements), this)) {
            elements = SelectionModeAll;
        }
        this.clear();
        for (const element of elements) {
            this.add(element);
        }
        this.signals.selectionModeChanged.dispatch(this);
    }
}

function eqSet<A>(as: Set<A>, bs: Set<A>) {
    if (as.size !== bs.size) return false;
    for (var a of as) if (!bs.has(a)) return false;
    return true;
}

export interface HasSelectedAndHovered {
    readonly mode: ToggleableSet;
    readonly selected: ModifiesSelection;
    readonly hovered: ModifiesSelection;
    makeTemporary(mode: ToggleableSet, signals: EditorSignals): SelectionDatabase;
}

export class SelectionDatabase implements HasSelectedAndHovered {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

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
    readonly selected = new Selection(this.db, this.selectedSignals);
    readonly hovered: Selection;

    constructor(
        readonly db: DatabaseLike,
        readonly materials: MaterialDatabase,
        readonly signals: EditorSignals,
        readonly mode = new ToggleableSet(SelectionModeAll, signals),
        hovered?: Selection
    ) {
        this.clearHovered = this.clearHovered.bind(this);
        signals.historyChanged.add(this.clearHovered);
        this.hovered = hovered ?? new Selection(this.db, this.hoveredSignals);
    }

    // Hover state is not preserved in undo history. So when the user performs undo/redo
    // the data could potentially be invalid. Hover state is volatile. Just clear it without
    // any notifications.
    private clearHovered() { this.hovered.clearSilently() }

    makeTemporary(mode: ToggleableSet, signals: EditorSignals): SelectionDatabase {
        return new SelectionDatabase(this.db, this.materials, signals, mode, this.hovered)
    }
}