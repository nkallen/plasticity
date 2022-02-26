import KeymapManager from "atom-keymap-plasticity";
import { ipcRenderer } from "electron";
import { CompositeDisposable, Disposable } from "event-kit";
import * as THREE from "three";
import Command from '../command/Command';
import { CommandExecutor } from "../command/CommandExecutor";
import { GizmoMaterialDatabase } from "../command/GizmoMaterials";
import { SelectionCommandManager } from "../command/SelectionCommandManager";
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
import { GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator, History } from "./History";
import { ImporterExporter } from "./ImporterExporter";
import LayerManager from "./LayerManager";
import MaterialDatabase, { BasicMaterialDatabase } from "./MaterialDatabase";
import { DoCacheMeshCreator, ParallelMeshCreator } from "./MeshCreator";
import { PlaneDatabase } from "./PlaneDatabase";
import { SnapManager } from './snaps/SnapManager';
import { SolidCopier } from "./SolidCopier";

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export class Editor {
    private readonly disposable = new CompositeDisposable();
    dispose() { this.disposable.dispose() }

    readonly viewports: Viewport[] = [];

    readonly signals = new EditorSignals();
    readonly registry = new CommandRegistry();
    readonly materials: MaterialDatabase = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals, this.styles);
    readonly copier = new SolidCopier();
    readonly meshCreator = new DoCacheMeshCreator(new ParallelMeshCreator(), this.copier);
    readonly db = new GeometryDatabase(this.meshCreator, this.copier, this.materials, this.signals);

    readonly curves = new PlanarCurveDatabase(this.db, this.materials, this.signals);
    readonly regions = new RegionManager(this.db, this.curves);
    readonly contours = new ContourManager(this.db, this.curves, this.regions);

    readonly selection = new SelectionDatabase(this.db, this.materials, this.signals);

    readonly registrar = new SelectionCommandRegistrar(this);

    readonly crosses = new CrossPointDatabase();
    readonly snaps = new SnapManager(this.db, this.crosses, this.signals);
    readonly keymaps = new KeymapManager();
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null }); // FIXME: viewRegistry shouldn't be null
    readonly layers = new LayerManager(this.selection.selected, this.signals);
    readonly helpers: Helpers = new Helpers(this.signals, this.styles);
    readonly changeSelection = new ChangeSelectionExecutor(this.selection, this.db, this.signals);
    readonly commandForSelection = new SelectionCommandManager(this);
    readonly originator = new EditorOriginator(this.db, this.selection.selected, this.snaps, this.crosses, this.curves, this.contours, this.viewports);
    readonly history = new History(this.originator, this.signals);
    readonly executor = new CommandExecutor(this);
    readonly keyboard = new KeyboardEventManager(this.keymaps);
    readonly backup = new Backup(this.originator, this.signals);
    readonly highlighter = new RenderedSceneBuilder(this.db, this.materials, this.selection, this.styles, this.signals);
    readonly importer = new ImporterExporter(this);
    readonly planes = new PlaneDatabase(this.signals);
    readonly clipboard = new Clipboard(this);

    windowLoaded = false;

    constructor(readonly styles = theme) {
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

        const d = this.registry.add(document.body, {
            'file:new': () => this.clear(),
            'file:open': () => this.open(),
            'file:save-as': () => this.export(),
            'edit:undo': () => this.undo(),
            'edit:redo': () => this.redo(),
            'edit:copy': () => this.clipboard.copy(),
            'edit:paste': () => this.clipboard.paste(),
            'repeat-last-command': () => this.executor.repeatLastCommand(),
            'noop': () => { },
        });
        this.disposable.add(d);
        this.disposable.add(this.registrar.register(this.registry));
    }

    async enqueue(command: Command, interrupt?: boolean) {
        await this.executor.enqueue(command, interrupt);
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

    async clear() {
        await this.backup.clear();
        ipcRenderer.invoke('reload');
    }

    async open() {
        const { filePaths } = await ipcRenderer.invoke('show-open-dialog', {
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: 'All supported', extensions: ['stp', 'step', 'c3d', 'igs', 'iges', 'sat'] },
                { name: 'STEP files', extensions: ['stp', 'step'] },
                { name: 'IGES files', extensions: ['igs', 'iges'] },
                { name: 'SAT files', extensions: ['sat'] },
                { name: 'C3D files', extensions: ['c3d'] }
            ]
        });
        this.importer.open(filePaths);
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
        const memento = this.db.saveToMemento().model;
        this.importer.export(memento, filePath!);
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

    debug() {
        this.originator.debug();
        this.executor.debug();
    }
}