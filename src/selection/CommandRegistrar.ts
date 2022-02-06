import { CompositeDisposable } from 'event-kit';
import * as cmd from "../command/Command";
import { EditorLike } from '../command/Command';
import CommandRegistry from '../components/atom/CommandRegistry';
import { DatabaseLike } from "../editor/DatabaseLike";
import * as visual from '../visual_model/VisualModel';
import { ChangeSelectionModifier, SelectionMode, SelectionModeAll } from './ChangeSelectionExecutor';
import { HasSelectedAndHovered } from './SelectionDatabase';

export class SelectionCommandRegistrar {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    constructor(
        private readonly editor: EditorLike
    ) { }

    register(registry: CommandRegistry) {
        const { selection } = this.editor;

        return registry.add(document.body, {
            'selection:mode:set:control-point': () => selection.mode.set(SelectionMode.ControlPoint),
            'selection:mode:set:edge': () => selection.mode.set(SelectionMode.CurveEdge, SelectionMode.Curve),
            'selection:mode:set:face': () => selection.mode.set(SelectionMode.Face),
            'selection:mode:set:solid': () => selection.mode.set(SelectionMode.Solid),
            'selection:mode:set:all': () => selection.mode.set(...SelectionModeAll),

            'selection:mode:toggle:control-point': () => selection.mode.toggle(SelectionMode.ControlPoint),
            'selection:mode:toggle:edge': () => selection.mode.toggle(SelectionMode.CurveEdge, SelectionMode.Curve),
            'selection:mode:toggle:face': () => selection.mode.toggle(SelectionMode.Face),
            'selection:mode:toggle:solid': () => selection.mode.toggle(SelectionMode.Solid),

            'selection:convert:edge': () => this.editor.enqueue(new ConvertCommand(this.editor, SelectionMode.CurveEdge)),
            'selection:convert:face': () => this.editor.enqueue(new ConvertCommand(this.editor, SelectionMode.Face)),
            'selection:convert:solid': () => this.editor.enqueue(new ConvertCommand(this.editor, SelectionMode.Solid)),

            'snaps:temporarily-enable': () => this.editor.snaps.xor = false,
            'snaps:temporarily-disable': () => this.editor.snaps.xor = true,
        })
    }
}

export class SelectionConversionStrategy {
    constructor(
        private readonly selection: HasSelectedAndHovered,
        private readonly db: DatabaseLike,
    ) { }

    convert(to: SelectionMode, modifier: ChangeSelectionModifier) {
        const { selection: { selected }, db } = this;
        switch (to) {
            case SelectionMode.CurveEdge:
                for (const view of selected.faces) {
                    this.face2edge(view);
                }
                for (const view of selected.solids) {
                    this.solid2edge(view);
                }
                break;
            case SelectionMode.Face:
                for (const view of selected.edges) {
                    this.edge2face(view);
                }
                for (const view of selected.solids) {
                    this.solid2face(view);
                }
                break;
            case SelectionMode.Solid: 
                for (const view of selected.edges) {
                    this.edge2solid(view);
                }
                for (const view of selected.faces) {
                    this.face2solid(view);
                }
        }
    }

    face2solid(view: visual.Face) {
        const { selection: { selected }, db } = this;
        selected.addSolid(view.parentItem);
        selected.removeFace(view);
    }

    edge2solid(view: visual.CurveEdge) {
        const { selection: { selected }, db } = this;
        selected.addSolid(view.parentItem);
        selected.removeEdge(view);
    }

    solid2face(view: visual.Solid) {
        const { selection: { selected }, db } = this;
        for (const faceView of view.faces) {
            selected.addFace(faceView);
        }
        selected.removeSolid(view);
    }

    edge2face(view: visual.CurveEdge) {
        const { selection: { selected }, db } = this;
        const parentView = view.parentItem;
        const parentModel = db.lookup(parentView);
        const parentId = view.parentItem.simpleName;
        const model = db.lookupTopologyItem(view);
        const plus = model.GetFacePlus();
        if (plus !== null) {
            const index = parentModel.GetFaceIndex(plus);
            const id = visual.Face.simpleName(parentId, index);
            const info = db.lookupTopologyItemById(id);
            const faceView = [...info.views][0] as visual.Face;
            selected.addFace(faceView);
        }
        const minus = model.GetFaceMinus();
        if (minus !== null) {
            const index = parentModel.GetFaceIndex(minus);
            const id = visual.Face.simpleName(parentId, index);
            const info = db.lookupTopologyItemById(id);
            const faceView = [...info.views][0] as visual.Face;
            selected.addFace(faceView);
        }
        selected.removeEdge(view);
    }

    private solid2edge(view: visual.Solid) {
        const { selection: { selected }, db } = this;
        for (const edgeView of view.edges) {
            selected.addEdge(edgeView);
        }
        selected.removeSolid(view);
    }

    private face2edge(view: visual.Face) {
        const { selection: { selected }, db } = this;
        const parentView = view.parentItem;
        const parentModel = db.lookup(parentView);
        const parentId = view.parentItem.simpleName;
        const model = db.lookupTopologyItem(view);
        for (const edgeModel of model.GetOuterEdges()) {
            const index = parentModel.GetEdgeIndex(edgeModel);
            const id = visual.CurveEdge.simpleName(parentId, index);
            const info = db.lookupTopologyItemById(id);
            const edgeView = [...info.views][0] as visual.CurveEdge;
            selected.addEdge(edgeView);
        }
        selected.removeFace(view);
    }
}

class ConvertCommand extends cmd.CommandLike {
    constructor(
        editor: cmd.EditorLike,
        private readonly mode: SelectionMode
    ) {
        super(editor);
    }

    async execute(): Promise<void> {
        const { mode } = this;
        this.editor.changeSelection.onConvert(mode, ChangeSelectionModifier.Replace);
    }
}