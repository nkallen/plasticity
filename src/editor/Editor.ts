import KeymapManager from "atom-keymap";
import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import Command from '../commands/Command';
import { CancelOrFinish, CommandExecutor } from "../commands/CommandExecutor";
import { GizmoMaterialDatabase } from "../commands/GizmoMaterials";
import { SelectionCommandManager } from "../commands/SelectionCommandManager";
import CommandRegistry from "../components/atom/CommandRegistry";
import TooltipManager from "../components/atom/tooltip-manager";
import Mouse2KeyboardEventManager from "../components/viewport/Mouse2KeyboardEventManager";
import { Viewport } from "../components/viewport/Viewport";
import { SelectionInteractionManager } from "../selection/SelectionInteraction";
import { SelectionManager } from "../selection/SelectionManager";
import { Helpers } from "../util/Helpers";
import { Backup } from "./Backup";
import ContourManager from "./ContourManager";
import { EditorSignals } from "./EditorSignals";
import { DatabaseLike, GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator, History } from "./History";
import LayerManager from "./LayerManager";
import MaterialDatabase, { BasicMaterialDatabase } from "./MaterialDatabase";
import { ModifierManager } from "./ModifierManager";
import { PlanarCurveDatabase } from "./PlanarCurveDatabase";
import { RegionManager } from "./RegionManager";
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals = new EditorSignals(); 
    readonly materials: MaterialDatabase = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals);
    readonly sprites = new SpriteDatabase();
    readonly _db = new GeometryDatabase(this.materials, this.signals);
    readonly modifiers = new ModifierManager(this._db, this.materials, this.signals);
    readonly db = this.modifiers as DatabaseLike;
    readonly curves = new PlanarCurveDatabase(this.db);
    readonly regions = new RegionManager(this._db, this.curves);
    readonly contours = new ContourManager(this.curves, this.regions, this.signals);
    readonly snaps = new SnapManager(this.db, this.gizmos, this.signals);
    readonly registry = new CommandRegistry();
    readonly keymaps = new KeymapManager();
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null }); // FIXME viewRegistry shouldn't be null
    readonly selection = new SelectionManager(this.db, this.materials, this.signals);
    readonly layers = new LayerManager(this.selection.selected, this.signals);
    readonly helpers: Helpers = new Helpers(this.signals);
    readonly selectionInteraction = new SelectionInteractionManager(this.selection, this.materials, this.signals);
    readonly selectionGizmo = new SelectionCommandManager(this);
    readonly originator = new EditorOriginator(this._db, this.selection.selected, this.snaps, this.curves);
    readonly history = new History(this.originator, this.signals);
    readonly executor = new CommandExecutor(this);
    readonly mouse2keyboard = new Mouse2KeyboardEventManager(this.keymaps);
    readonly backup = new Backup(this._db, this.signals);

    disposable = new CompositeDisposable();

    windowLoaded = false;

    constructor() {
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onWindowLoad = this.onWindowLoad.bind(this);
        this.onViewportActivated = this.onViewportActivated.bind(this);

        window.addEventListener('resize', this.onWindowResize, false);
        window.addEventListener('load', this.onWindowLoad, false);

        this.signals.viewportActivated.add(this.onViewportActivated);

        this.disposable.add(new Disposable(() => window.removeEventListener('resize', this.onWindowResize)));
        this.disposable.add(new Disposable(() => window.removeEventListener('load', this.onWindowLoad)));

        this.registry.attach(window);
        this.keymaps.defaultTarget = document.body;

        const d = this.registry.add("ispace-workspace", {
            'undo': () => this.undo(),
            'redo': () => this.redo(),
        });
        this.disposable.add(d);
    }

    async enqueue(command: Command, cancelOrFinish?: CancelOrFinish) {
        await this.executor.enqueue(command, cancelOrFinish);
    }

    private async undo() {
        this.executor.cancelActiveCommand();
        this.history.undo();
        this.executor.enqueueDefaultCommand();
    }

    private redo() {
        this.executor.cancelActiveCommand();
        this.history.redo();
        this.executor.enqueueDefaultCommand();
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.windowLoaded = true;
        this.signals.windowLoaded.dispatch();
    }

    private _activeViewport?: Viewport;
    get activeViewport() { return this._activeViewport }
    onViewportActivated(v: Viewport) {
        this._activeViewport = v;
    }
}
