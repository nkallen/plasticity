import KeymapManager from "atom-keymap-plasticity";
import { ipcRenderer, IpcRendererEvent } from "electron";
import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import Command from '../command/Command';
import { CommandExecutor } from "../command/CommandExecutor";
import { GizmoMaterialDatabase } from "../command/GizmoMaterials";
import { SelectionCommandManager } from "../command/SelectionCommandManager";
import { ExportCommand, ImportCommand } from "../commands/CommandLike";
import CommandRegistry from "../components/atom/CommandRegistry";
import TooltipManager from "../components/atom/tooltip-manager";
import KeyboardEventManager from "../components/viewport/KeyboardEventManager";
import { Viewport } from "../components/viewport/Viewport";
import { ChangeSelectionExecutor } from "../selection/ChangeSelectionExecutor";
import { SelectionCommandRegistrar } from "../selection/CommandRegistrar";
import { SelectionDatabase } from "../selection/SelectionDatabase";
import theme from '../startup/default-theme';
import { Helpers } from "../util/Helpers";
import { RenderedSceneBuilder } from "../visual_model/RenderedSceneBuilder";
import { Backup } from "./Backup";
import { Clipboard } from "./Clipboard";
import ContourManager from "./curves/ContourManager";
import { CrossPointDatabase } from "./curves/CrossPointDatabase";
import { PlanarCurveDatabase } from "./curves/PlanarCurveDatabase";
import { RegionManager } from "./curves/RegionManager";
import { DatabaseLike } from "./DatabaseLike";
import { EditorSignals } from "./EditorSignals";
import { Empties } from "./Empties";
import { Images } from "./Images";
import { GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator, History } from "./History";
import { ImporterExporter } from "./ImporterExporter";
import LayerManager from "./LayerManager";
import { BasicMaterialDatabase } from "./MaterialDatabase";
import { DoCacheMeshCreator, ParallelMeshCreator } from "./MeshCreator";
import { PlaneDatabase } from "./PlaneDatabase";
import { Scene } from "./Scene";
import { SnapManager } from './snaps/SnapManager';
import { SolidCopier } from "./SolidCopier";
import { TextureLoader } from "./TextureLoader";

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export class Editor {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    readonly textures = new TextureLoader();
    readonly viewports: Viewport[] = [];

    readonly signals = new EditorSignals();
    readonly registry = new CommandRegistry();
    readonly materials = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals, this.styles);
    readonly copier = new SolidCopier();
    readonly meshCreator = new DoCacheMeshCreator(new ParallelMeshCreator(), this.copier);
    readonly _db = new GeometryDatabase(this.meshCreator, this.copier, this.materials, this.signals);

    readonly curves = new PlanarCurveDatabase(this._db);
    readonly regions = new RegionManager(this._db, this.curves);
    readonly contours = new ContourManager(this._db, this.curves, this.regions, this.signals);
    readonly db = this.contours as DatabaseLike;
    readonly images = new Images();
    readonly empties = new Empties(this.images, this.signals);
    readonly scene = new Scene(this._db, this.empties, this.materials, this.signals);

    readonly selection = new SelectionDatabase(this._db, this.scene, this.materials, this.signals);

    readonly registrar = new SelectionCommandRegistrar(this);

    readonly crosses = new CrossPointDatabase();
    readonly snaps = new SnapManager(this.db, this.scene, this.crosses, this.signals);
    readonly keymaps = new KeymapManager();
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null }); // FIXME: viewRegistry shouldn't be null
    readonly layers = new LayerManager(this.selection.selected, this.signals);
    readonly helpers: Helpers = new Helpers(this.signals, this.styles);
    readonly changeSelection = new ChangeSelectionExecutor(this.selection, this.db, this.scene, this.signals);
    readonly commandForSelection = new SelectionCommandManager(this);
    readonly originator = new EditorOriginator(this._db, this.empties, this.scene, this.materials, this.selection.selected, this.snaps, this.crosses, this.curves, this.contours, this.viewports, this.images);
    readonly history = new History(this.originator, this.signals);
    readonly executor = new CommandExecutor(this);
    readonly keyboard = new KeyboardEventManager(this.keymaps);
    readonly backup = new Backup(this.originator, this.signals);
    readonly highlighter = new RenderedSceneBuilder(this.db, this.scene, this.textures, this.selection, this.styles, this.signals);
    readonly importer = new ImporterExporter(this._db, this.empties, this.scene, this.images, this.contours);
    readonly planes = new PlaneDatabase(this.signals);
    readonly clipboard = new Clipboard(this);

    windowLoaded = false;

    constructor(readonly styles = theme) {
        window.addEventListener('resize', this.onWindowResize, false);
        window.addEventListener('load', this.onWindowLoad, false);

        this.signals.viewportActivated.add(this.onViewportActivated);

        this.disposable.add(new Disposable(() => window.removeEventListener('resize', this.onWindowResize)));
        this.disposable.add(new Disposable(() => window.removeEventListener('load', this.onWindowLoad)));

        this.registry.attach(window);
        this.keymaps.defaultTarget = document.body;

        this.registerCommands();
    }

    async enqueue(command: Command, interrupt?: boolean) {
        await this.executor.enqueue(command, interrupt);
    }

    onWindowResize = () => {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad = () => {
        this.windowLoaded = true;
        this.signals.windowLoaded.dispatch();
    }

    private _activeViewport?: Viewport;
    get activeViewport() { return this._activeViewport ?? this.viewports[0] }
    onViewportActivated = (v: Viewport) => {
        this._activeViewport = v;
    }

    clear = async () => {
        await this.backup.clear();
        ipcRenderer.invoke('reload');
    }

    async open() {
        const { filePaths } = await ipcRenderer.invoke('show-open-dialog', {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'All supported', extensions: ['stp', 'step', 'c3d', 'igs', 'iges', 'sat', 'png'] },
                { name: 'STEP files', extensions: ['stp', 'step'] },
                { name: 'IGES files', extensions: ['igs', 'iges'] },
                { name: 'SAT files', extensions: ['sat'] },
                { name: 'C3D files', extensions: ['c3d'] },
                { name: 'Image files', extensions: ['png'] }
            ]
        });
        const command = new ImportCommand(this);
        command.filePaths = filePaths;
        this.enqueue(command);
    }

    async export() {
        const { canceled, filePath } = await ipcRenderer.invoke('show-save-dialog', {
            filters: [
                { name: 'C3D files', extensions: ['c3d'] },
                { name: 'STEP files', extensions: ['stp', 'step'] },
                { name: 'IGES files', extensions: ['igs', 'iges'] },
                { name: 'SAT files', extensions: ['sat'] },
                { name: 'Wavefront OBJ', extensions: ['obj'] },
            ]
        });
        if (canceled) return;
        const memento = this._db.saveToMemento().model;
        if (/\.obj$/.test(filePath!)) {
            const command = new ExportCommand(this);
            command.filePath = filePath!;
            this.enqueue(command);
        } else {
            this.importer.export(memento, filePath!);
        }
    }

    private async undo() {
        this.executor.cancelActiveCommand();
        console.info("Undo");
        this.history.undo();
        this.executor.enqueueDefaultCommand();
    }

    private redo() {
        this.executor.cancelActiveCommand();
        console.info("Redo");
        this.history.redo();
        this.executor.enqueueDefaultCommand();
    }

    private registerCommands() {
        const d = this.registry.add(document.body, {
            'file:new': () => this.clear(),
            'file:open': () => this.open(),
            'file:save-as': () => this.export(),
            'edit:undo': () => this.undo(),
            'edit:redo': () => this.redo(),
            'edit:copy': () => this.clipboard.copy(),
            'edit:paste': () => this.clipboard.paste(),
            'edit:repeat-last-command': () => this.executor.repeatLastCommand(),
            'noop': () => { },
        });
        ipcRenderer.on('menu-command', this.command);
        this.disposable.add(new Disposable(() => {
            ipcRenderer.removeListener('menu-command', this.command);
        }));
        this.disposable.add(d);
        this.disposable.add(this.registrar.register(this.registry));
    }

    private command = (event: IpcRendererEvent, ...args: any[]) => {
        const element = this.activeViewport?.domElement ?? document.body;
        element.dispatchEvent(new CustomEvent(args[0], { bubbles: true }));
    }


    debug() {
        this.originator.debug();
        this.executor.debug();
    }
}