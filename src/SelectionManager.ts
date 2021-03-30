
import { Editor } from './Editor';
import * as THREE from "three";
import { CurveEdge } from './VisualModel';

export class SelectionManager {
    readonly selected = new Set<THREE.Object3D>();
    readonly editor: Editor;

    constructor(editor: Editor) {
        this.editor = editor;
    }

    select(object: THREE.Object3D) {
        if (!(object instanceof CurveEdge)) return;

        if (this.selected.has(object)) {
            this.selected.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        } else {
            this.selected.add(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.highlight(model);
            this.editor.signals.objectSelected.dispatch(object);
        }
    }

    deselectAll() {
        for (const object of this.selected) {
            this.selected.delete(object);
            const model = this.editor.lookupTopologyItem(object);
            object.material = this.editor.materialDatabase.lookup(model);
            this.editor.signals.objectDeselected.dispatch(object);
        }
    }
}
