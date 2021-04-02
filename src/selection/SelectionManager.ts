import { Editor } from '../Editor';
import { Face, CurveEdge, TopologyItem, CurveSegment, Solid, SpaceInstance } from '../VisualModel';
import { RefCounter } from '../Util';
import { Hoverable, HoverStrategy } from './Hover';

export enum SelectionMode {
    Edge, Face, Solid, Curve
}

export interface SelectionStrategy {
    emptyIntersection(): void;
    solid(object: TopologyItem, parentItem: Solid): boolean;
    topologicalItem(object: TopologyItem, parentItem: Solid): boolean;
    curve3D(object: CurveSegment, parentItem: SpaceInstance): boolean;
    invalidIntersection(): void;
}

class ClickStrategy implements SelectionStrategy {
    constructor(private selectionManager: SelectionManager) {
    }

    emptyIntersection() {
        this.selectionManager.deselectAll();
    }

    invalidIntersection() { }

    curve3D(object: CurveSegment, parentItem: SpaceInstance) {
        const model = this.selectionManager.editor.lookupItem(parentItem);

        if (this.selectionManager.mode.has(SelectionMode.Curve)) {
            if (this.selectionManager.selectedCurves.has(parentItem)) {
                this.selectionManager.selectedCurves.delete(parentItem);
                object.material = this.selectionManager.editor.materialDatabase.line(model);
                this.selectionManager.editor.signals.objectDeselected.dispatch(parentItem);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedCurves.add(parentItem);
                object.material = this.selectionManager.editor.materialDatabase.highlight(model);
                this.selectionManager.editor.signals.objectSelected.dispatch(parentItem);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.selectedSolids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selectionManager.selectedSolids.delete(parentItem);
                this.selectionManager.editor.signals.objectDeselected.dispatch(parentItem);
            }
            return true;
        } else if (!this.selectionManager.selectedChildren.has(parentItem)) {
            this.selectionManager.hover?.dispose();
            this.selectionManager.hover = null;
            this.selectionManager.selectedSolids.add(parentItem);
            this.selectionManager.editor.signals.objectSelected.dispatch(parentItem);
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        const model = this.selectionManager.editor.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selectionManager.selectedFaces.has(object)) {
                this.selectionManager.selectedFaces.delete(object);
                object.material = this.selectionManager.editor.materialDatabase.lookup(model);
                this.selectionManager.selectedChildren.decr(parentItem);
                this.selectionManager.editor.signals.objectDeselected.dispatch(object);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedFaces.add(object);
                object.material = this.selectionManager.editor.materialDatabase.highlight(model);
                this.selectionManager.selectedChildren.incr(parentItem);
                this.selectionManager.editor.signals.objectSelected.dispatch(object);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge) {
            if (this.selectionManager.selectedEdges.has(object)) {
                this.selectionManager.selectedEdges.delete(object);
                object.material = this.selectionManager.editor.materialDatabase.lookup(model);
                this.selectionManager.selectedChildren.decr(parentItem);
                this.selectionManager.editor.signals.objectDeselected.dispatch(object);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedEdges.add(object);
                object.material = this.selectionManager.editor.materialDatabase.highlight(model);
                this.selectionManager.selectedChildren.incr(parentItem);
                this.selectionManager.editor.signals.objectSelected.dispatch(object);
            }
            return true;
        }
        return false;
    }
}

export class SelectionManager {
    readonly selectedSolids = new Set<Solid>();
    readonly selectedChildren = new RefCounter();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly selectedCurves = new Set<SpaceInstance>();
    readonly editor: Editor;
    readonly mode = new Set<SelectionMode>([SelectionMode.Solid, SelectionMode.Edge, SelectionMode.Curve]);
    hover?: Hoverable = null;

    private readonly clickStrategy = new ClickStrategy(this);
    private readonly hoverStrategy = new HoverStrategy(this);

    constructor(editor: Editor) {
        this.editor = editor;
    }

    private onIntersection(intersections: THREE.Intersection[], strategy: SelectionStrategy) {
        if (intersections.length == 0) {
            strategy.emptyIntersection();
            return;
        }

        for (const intersection of intersections) {
            const object = intersection.object;
            if (object instanceof Face || object instanceof CurveEdge) {
                const parentItem = object.parentItem;
                if (this.mode.has(SelectionMode.Solid)) {
                    if (strategy.solid(object, parentItem as Solid)) return;
                }
                if (strategy.topologicalItem(object, parentItem as Solid)) return;
            } else if (object instanceof CurveSegment) {
                const parentItem = object.parentItem;
                if (strategy.curve3D(object, parentItem)) return;
            }
        }
    }

    onClick(intersections: THREE.Intersection[]) {
        this.onIntersection(intersections, this.clickStrategy);
    }

    onPointerMove(intersections: THREE.Intersection[]) {
        this.onIntersection(intersections, this.hoverStrategy);
    }

    deselectAll() {
        for (const object of this.selectedEdges) {
            this.selectedEdges.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedFaces) {
            this.selectedFaces.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        for (const object of this.selectedSolids) {
            this.selectedSolids.delete(object);
            this.editor.signals.objectDeselected.dispatch(object);
        }
        this.selectedChildren.clear();
    }
}
