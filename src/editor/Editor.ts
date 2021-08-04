import KeymapManager from "atom-keymap";
import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import Command from '../commands/Command';
import { CancelOrFinish, CommandExecutor } from "../commands/CommandExecutor";
import ContourManager, { PlanarCurveDatabase } from "../commands/ContourManager";
import { GizmoMaterialDatabase } from "../commands/GizmoMaterials";
import { SelectionCommandManager } from "../commands/SelectionCommandManager";
import CommandRegistry from "../components/atom/CommandRegistry";
import TooltipManager from "../components/atom/tooltip-manager";
import Mouse2KeyboardEventManager from "../components/viewport/Mouse2KeyboardEventManager";
import { Viewport } from "../components/viewport/Viewport";
import { SelectionInteractionManager } from "../selection/SelectionInteraction";
import { SelectionManager } from "../selection/SelectionManager";
import { Helpers } from "../util/Helpers";
import { EditorSignals } from "./EditorSignals";
import { GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator, History } from "./History";
import LayerManager from "./LayerManager";
import MaterialDatabase, { BasicMaterialDatabase } from "./MaterialDatabase";
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";
import Transactions from './Transactions';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals = new EditorSignals(); 
    readonly materials: MaterialDatabase = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals);
    readonly sprites = new SpriteDatabase();
    readonly db = new GeometryDatabase(this.materials, this.signals);
    readonly curves = new PlanarCurveDatabase(this.db);
    readonly contours = new ContourManager(this.curves, this.signals);
    readonly snaps = new SnapManager(this.db, this.sprites, this.signals);
    readonly registry = new CommandRegistry();
    readonly keymaps = new KeymapManager();
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null }); // FIXME viewRegistry shouldn't be null
    readonly selection = new SelectionManager(this.db, this.materials, this.signals);
    readonly layers = new LayerManager(this.selection, this.signals);
    readonly helpers: Helpers = new Helpers(this.signals);
    readonly scene = new THREE.Scene();
    readonly selectionInteraction = new SelectionInteractionManager(this.selection, this.materials, this.signals);
    readonly selectionGizmo = new SelectionCommandManager(this);
    readonly originator = new EditorOriginator(this.db, this.selection, this.snaps, this.curves);
    readonly history = new History(this.originator, this.signals);
    readonly transactoins = new Transactions(this.db, this.signals);
    readonly executor = new CommandExecutor(this.selectionGizmo, this.registry, this.signals, this.originator, this.history, this.selection, this.contours);
    readonly mouse2keyboard = new Mouse2KeyboardEventManager(this.keymaps);

    disposable = new CompositeDisposable();

    constructor() {
        this.onWindowResize = this.onWindowResize.bind(this);
        this.onWindowLoad = this.onWindowLoad.bind(this);

        window.addEventListener('resize', this.onWindowResize, false);
        window.addEventListener('load', this.onWindowLoad, false);

        this.disposable.add(new Disposable(() => window.removeEventListener('resize', this.onWindowResize)));
        this.disposable.add(new Disposable(() => window.removeEventListener('load', this.onWindowLoad)));

        this.registry.attach(window);
        this.keymaps.defaultTarget = document.body;

        this.scene.background = new THREE.Color(0x424242);

        const d = this.registry.add("ispace-workspace", {
            'undo': () => this.undo(),
            'redo': () => this.redo()
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
        this.signals.windowLoaded.dispatch();
    }
}
