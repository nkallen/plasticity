import { Curve3D, CurveSegment } from "../VisualModel";
import { Solid } from "../VisualModel";
import { CurveEdge } from "../VisualModel";
import { Face } from "../VisualModel";
import { TopologyItem } from "../VisualModel";
import { SpaceInstance } from "../VisualModel";
import { SelectionManager, SelectionMode, SelectionStrategy } from "./SelectionManager";

export class ClickStrategy implements SelectionStrategy {
    constructor(private selectionManager: SelectionManager) {
    }

    emptyIntersection() {
        this.selectionManager.deselectAll();
    }

    invalidIntersection() { }

    curve3D(object: CurveSegment, parentItem: SpaceInstance<Curve3D>) {
        const model = this.selectionManager.db.lookup(parentItem);

        if (this.selectionManager.mode.has(SelectionMode.Curve)) {
            if (this.selectionManager.selectedCurves.has(parentItem)) {
                this.selectionManager.selectedCurves.delete(parentItem);
                object.material = this.selectionManager.materials.line(model);
                this.selectionManager.signals.objectDeselected.dispatch(parentItem);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedCurves.add(parentItem);
                object.material = this.selectionManager.materials.highlight(model);
                this.selectionManager.signals.objectSelected.dispatch(parentItem);
            }
            return true;
        }
        return false;
    }

    solid(object: TopologyItem, parentItem: Solid): boolean {
        if (this.selectionManager.selectedSolids.has(parentItem)) {
            if (this.topologicalItem(object, parentItem)) {
                this.selectionManager.selectedSolids.delete(parentItem);
                this.selectionManager.signals.objectDeselected.dispatch(parentItem);
                return true;
            }
            return false;
        } else if (!this.selectionManager.selectedChildren.has(parentItem)) {
            this.selectionManager.hover?.dispose();
            this.selectionManager.hover = null;
            this.selectionManager.selectedSolids.add(parentItem);
            this.selectionManager.signals.objectSelected.dispatch(parentItem);
            return true;
        }
        return false;
    }

    topologicalItem(object: TopologyItem, parentItem: Solid): boolean {
        const model = this.selectionManager.db.lookupTopologyItem(object); // FIXME it would be better to not lookup anything
        if (this.selectionManager.mode.has(SelectionMode.Face) && object instanceof Face) {
            if (this.selectionManager.selectedFaces.has(object)) {
                this.selectionManager.selectedFaces.delete(object);
                object.material = this.selectionManager.materials.lookup(model);
                this.selectionManager.selectedChildren.decr(parentItem);
                this.selectionManager.signals.objectDeselected.dispatch(object);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedFaces.add(object);
                object.material = this.selectionManager.materials.highlight(model);
                this.selectionManager.selectedChildren.incr(parentItem);
                this.selectionManager.signals.objectSelected.dispatch(object);
            }
            return true;
        } else if (this.selectionManager.mode.has(SelectionMode.Edge) && object instanceof CurveEdge) {
            if (this.selectionManager.selectedEdges.has(object)) {
                this.selectionManager.selectedEdges.delete(object);
                object.material = this.selectionManager.materials.lookup(model);
                this.selectionManager.selectedChildren.decr(parentItem);
                this.selectionManager.signals.objectDeselected.dispatch(object);
            } else {
                this.selectionManager.hover?.dispose();
                this.selectionManager.hover = null;
                this.selectionManager.selectedEdges.add(object);
                object.material = this.selectionManager.materials.highlight(model);
                this.selectionManager.selectedChildren.incr(parentItem);
                this.selectionManager.signals.objectSelected.dispatch(object);
            }
            return true;
        }
        return false;
    }
}