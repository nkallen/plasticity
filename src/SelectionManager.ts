
import { Editor } from './Editor';
import * as THREE from "three";
import { Edge, Face, Item, CurveEdge } from './VisualModel';

export class SelectionManager {
    readonly selectedItems = new Set<Item>();
    readonly selectedEdges = new Set<CurveEdge>();
    readonly selectedFaces = new Set<Face>();
    readonly editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    select(object: THREE.Object3D) {
        if (object instanceof CurveEdge) {
            this.selectEdge(object);
        }
    }

    selectItem(item: Item) {

    }

    selectEdge(edge: CurveEdge) {
        if (this.selectedEdges.has(edge)) {
            this.selectedEdges.delete(edge);
            const model = this.editor.lookupTopologyItem(edge);
            edge.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(edge);
        } else {
            this.selectedEdges.add(edge);
            const model = this.editor.lookupTopologyItem(edge);
            edge.material = this.editor.materialDatabase.highlight(model);
            this.editor.signals.objectSelected.dispatch(edge);
        }
    }

    selectFace(face: Face) {

    }

    deselectAll() {
        for (const object of this.selectedEdges) {
            this.selectedEdges.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
    }
}
