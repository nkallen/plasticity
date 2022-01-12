import _ from "underscore-plus";
import CommandRegistry from "../components/atom/CommandRegistry";
import { Viewport } from "../components/viewport/Viewport";
import { CrossPointDatabase } from "../editor/curves/CrossPointDatabase";
import { PlanarCurveDatabase } from "../editor/curves/PlanarCurveDatabase";
import { EditorSignals } from "../editor/EditorSignals";
import { Agent, DatabaseLike } from "../editor/DatabaseLike";
import LayerManager from "../editor/LayerManager";
import MaterialDatabase from "../editor/MaterialDatabase";
import ModifierManager from "../editor/ModifierManager";
import { SnapManager } from "../editor/snaps/SnapManager";
import { ChangeSelectionExecutor } from "../selection/ChangeSelectionExecutor";
import { HasSelectedAndHovered } from "../selection/SelectionDatabase";
import { CancellableRegistor } from "../util/CancellableRegistor";
import { Helpers } from "../util/Helpers";
import { RenderedSceneBuilder } from "../visual_model/RenderedSceneBuilder";
import { GizmoMaterialDatabase } from "./GizmoMaterials";

/**
 * Commands have two responsibilities. They are usually a step-by-step interactive workflow for geometrical
 * operations, like creating a cylinder. But they also encapsulate any state change that needs to be atomic,
 * for the purposes of UNDO. Thus, selection changes are also commands.
 * 
 * For the most part, a Command is a user-friendly wrapper around a Factory. The factory actually creates 
 * geometrical objects and adds them to the database. Whereas the Command shows the users a dialog box,
 * interactive gizmos, etc. While the user interacts with the gizmo or dialog fields, the factory is
 * "updated". When the user is finished the factory is "committed".
 * 
 * Commands can be written such that they complete immediately after the user's first interaction
 * (as in the Move command), or they can stick around allowing the user to refine values and finish
 * only when the user clicks "ok" (as in the Fillet command).
 * 
 * A key implementation detail of Commands is that they have "resources". Resources include gizmos, dialogs,
 * and factories. A resource represents something that can be "finished" or "cancelled." Modeling all of
 * these objects as resources makes it easy to clean-up a command when finishing or cancelling. Because
 * most resources deal with Promises, it's important to make sure all exceptions are handled. Normally,
 * `await gizmo.execute()` is most natural, but for more complicated commands, `await this.finished` is
 * an option.
 */

export interface EditorLike {
    db: DatabaseLike,
    curves: PlanarCurveDatabase,
    signals: EditorSignals,
    materials: MaterialDatabase,
    viewports: Viewport[],
    snaps: SnapManager,
    helpers: Helpers,
    registry: CommandRegistry,
    selection: HasSelectedAndHovered & ModifierManager,
    gizmos: GizmoMaterialDatabase,
    changeSelection: ChangeSelectionExecutor,
    layers: LayerManager,
    activeViewport?: Viewport,
    enqueue(command: Command, interrupt?: boolean): Promise<void>,
    modifiers: ModifierManager,
    crosses: CrossPointDatabase,
    keymaps: AtomKeymap.KeymapManager,
    highlighter: RenderedSceneBuilder,
}

export default abstract class Command extends CancellableRegistor {
    static get title() { return this.name.replace(/Command/, '') }
    static get identifier() { return _.dasherize(this.title) }

    get title() { return this.constructor.name.replace(/Command/, '') }
    get identifier() { return _.dasherize(this.title) }
    get pretty() { return _.undasherize(this.identifier) }

    remember: boolean = true;
    agent: Agent = 'automatic';

    constructor(protected readonly editor: EditorLike) {
        super();
    }

    abstract execute(): Promise<void>;

    shouldAddToHistory(selectionChanged: boolean) {
        return true;
    }
}

export abstract class CommandLike extends Command {
    remember = false;
}