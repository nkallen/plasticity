import Command, * as cmd from "./Command";

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
        let point;
        const selection = this.editor.selection;
        if (intersection) {
            point = intersection.point;
        }
        this.editor.signals.selectionChanged.dispatch({ selection, point });
        this.intersection = intersection;
    }
}