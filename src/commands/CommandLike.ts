import Command, * as cmd from "./Command";
import * as visual from "../editor/VisualModel";
import { RebuildFactory } from "./rebuild/RebuildFactory";
import { GizmoLike } from "./AbstractGizmo";
import c3d from '../../../build/Release/c3d.node';

/**
 * These aren't typical commands, with a set of steps and gizmos to perform a geometrical operation.
 * But these represent actions/state-changes that are meant to be atomic (for the purpose of UNDO).
 */

export class ChangeSelectionCommand extends Command {
    constructor(
        editor: cmd.EditorLike,
        private readonly intersections: THREE.Intersection[]
    ) {
        super(editor);
    }

    intersection?: THREE.Intersection;

    async execute(): Promise<void> {
        const intersection = this.editor.selectionInteraction.onClick(this.intersections);
        const point = intersection?.point;
        this.intersection = intersection;
    }
}

export class RebuildCommand extends Command {
    dup: c3d.Item;

    constructor(
        editor: cmd.EditorLike,
        private readonly item: visual.Item,
        private readonly element: GizmoLike<() => void>
    ) {
        super(editor);

        const model = this.editor.db.lookup(item);
        this.dup = model.Duplicate().Cast<c3d.Item>(model.IsA());
    }

    async execute(): Promise<void> {
        const factory = new RebuildFactory(this.editor.db, this.editor.materials, this.editor.signals).resource(this);
        factory.item = this.item;
        factory.dup = this.dup;
        await this.element.execute(async () => {
            await factory.update();
        }).resource(this);
        const selection = await factory.commit() as visual.Solid;
        this.editor.selection.selectSolid(selection);
    }
}