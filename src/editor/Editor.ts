import KeymapManager from "atom-keymap";
import { remote } from 'electron';
import { CompositeDisposable, Disposable } from "event-kit";
import * as fs from 'fs';
import * as THREE from "three";
import Command from '../commands/Command';
import { CancelOrFinish, CommandExecutor } from "../commands/CommandExecutor";
import { GizmoMaterialDatabase } from "../commands/GizmoMaterials";
import { SelectionCommandManager } from "../commands/SelectionCommandManager";
import CommandRegistry from "../components/atom/CommandRegistry";
import TooltipManager from "../components/atom/tooltip-manager";
import KeyboardEventManager from "../components/viewport/KeyboardEventManager";
import { Viewport } from "../components/viewport/Viewport";
import { ModifierHighlightManager } from "../selection/HighlightManager";
import { SelectionInteractionManager } from "../selection/SelectionInteraction";
import { SelectionManager } from "../selection/SelectionManager";
import { Helpers } from "../util/Helpers";
import { CreateMutable } from "../util/Util";
import { Backup } from "./Backup";
import ContourManager from "./ContourManager";
import { EditorSignals } from "./EditorSignals";
import { DatabaseLike, GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator, History } from "./History";
import LayerManager from "./LayerManager";
import MaterialDatabase, { BasicMaterialDatabase } from "./MaterialDatabase";
import ModifierManager from "./ModifierManager";
import { PlanarCurveDatabase } from "./PlanarCurveDatabase";
import { RegionManager } from "./RegionManager";
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";
import c3d from '../../build/Release/c3d.node';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals = new EditorSignals();
    readonly materials: MaterialDatabase = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals);
    readonly sprites = new SpriteDatabase();
    readonly _db = new GeometryDatabase(this.materials, this.signals);
    readonly _selection = new SelectionManager(this._db, this.materials, this.signals);
    readonly modifiers = new ModifierManager(this._db, this._selection, this.materials, this.signals);
    readonly selection = this.modifiers;
    readonly db = this.modifiers as DatabaseLike;
    readonly curves = new PlanarCurveDatabase(this.db);
    readonly regions = new RegionManager(this._db, this.curves);
    readonly contours = new ContourManager(this.curves, this.regions, this.signals);
    readonly snaps = new SnapManager(this.db, this.gizmos, this.signals);
    readonly registry = new CommandRegistry();
    readonly keymaps = new KeymapManager();
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null }); // FIXME viewRegistry shouldn't be null
    readonly layers = new LayerManager(this.selection.selected, this.signals);
    readonly helpers: Helpers = new Helpers(this.signals);
    readonly selectionInteraction = new SelectionInteractionManager(this.modifiers, this.materials, this.signals);
    readonly selectionGizmo = new SelectionCommandManager(this);
    readonly originator = new EditorOriginator(this._db, this._selection.selected, this.snaps, this.curves, this.modifiers);
    readonly history = new History(this.originator, this.signals);
    readonly executor = new CommandExecutor(this);
    readonly mouse2keyboard = new KeyboardEventManager(this.keymaps);
    readonly backup = new Backup(this.originator, this.signals);
    readonly highlighter = new ModifierHighlightManager(this.modifiers, this.db, this.materials, this.selection, this.signals);

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

    clear() {
        this.backup.clear();
        remote.getCurrentWindow().reload();
    }

    async open() {
        const result = await remote.dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Files', extensions: ['c3d', 'stp'] }] })
        for (const filePath of result.filePaths) {
            if (/\.c3d$/.test(filePath)) {
                const data = await fs.promises.readFile(filePath);
                this._db.deserialize(data);
            } else {
                const { result, model } = await c3d.Conversion.ImportFromFile_async(filePath);
                this._db.load(model);
            }
        }
    }
}

export class HotReloadingEditor extends Editor {
    constructor() {
        super();

        if (module.hot) {
            const editor: CreateMutable<Editor> = this;

            module.hot.accept('../selection/HighlightManager', () => {
                editor.highlighter = new ModifierHighlightManager(this.modifiers, this.db, this.materials, this.selection, this.signals);
                editor.highlighter.highlight();
                this.signals.moduleReloaded.dispatch();
            });
        }
    }
}