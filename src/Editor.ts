import KeymapManager from "atom-keymap";
import { CompositeDisposable, Disposable } from "event-kit";
import signals from "signals";
import * as THREE from "three";
import c3d from '../build/Release/c3d.node';
import Command from './commands/Command';
import { CancelOrFinish, CommandExecutor } from "./commands/CommandExecutor";
import ContourManager from './commands/ContourManager';
import { AbstractDialog } from "./commands/fillet/FilletDialog";
import { GizmoMaterialDatabase } from "./commands/GizmoMaterials";
import { SelectionCommandManager } from "./commands/SelectionCommandManager";
import CommandRegistry from "./components/atom/CommandRegistry";
import TooltipManager from "./components/atom/tooltip-manager";
import { Viewport } from "./components/viewport/Viewport";
import { GeometryDatabase } from "./GeometryDatabase";
import { EditorOriginator, History } from "./History";
import MaterialDatabase, { BasicMaterialDatabase } from "./MaterialDatabase";
import { SelectionInteractionManager } from "./selection/SelectionInteraction";
import { HasSelection, SelectionManager } from "./selection/SelectionManager";
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";
import Transactions from './Transactions';
import { Helpers } from "./util/Helpers";
import * as visual from './VisualModel';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<visual.Item>;
    objectRemoved: signals.Signal<visual.Item>;
    objectSelected: signals.Signal<visual.Item | visual.TopologyItem>;
    objectDeselected: signals.Signal<visual.Item | visual.TopologyItem>;
    objectHovered: signals.Signal<visual.Item | visual.TopologyItem>
    objectUnhovered: signals.Signal<visual.Item | visual.TopologyItem>
    selectionChanged: signals.Signal<{ selection: HasSelection, point?: THREE.Vector3 }>;
    sceneGraphChanged: signals.Signal;
    factoryUpdated: signals.Signal;
    factoryCommitted: signals.Signal;
    pointPickerChanged: signals.Signal;
    gizmoChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    renderPrepared: signals.Signal<{ camera: THREE.Camera, resolution: THREE.Vector2 }>;
    commandStarted: signals.Signal<Command>;
    commandEnded: signals.Signal;
    keybindingsRegistered: signals.Signal<string[]>;
    keybindingsCleared: signals.Signal<string[]>;
    hovered: signals.Signal<THREE.Intersection[]>;
    historyChanged: signals.Signal;
    contoursChanged: signals.Signal;
    creatorChanged: signals.Signal<{ creator: c3d.Creator, item: visual.Item }>;
    dialogAdded: signals.Signal<AbstractDialog<any>>;
    dialogRemoved: signals.Signal;
}

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        objectRemoved: new signals.Signal(),
        objectSelected: new signals.Signal(),
        objectDeselected: new signals.Signal(),
        selectionChanged: new signals.Signal(),
        objectHovered: new signals.Signal(),
        objectUnhovered: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        factoryUpdated: new signals.Signal(),
        factoryCommitted: new signals.Signal(),
        pointPickerChanged: new signals.Signal(),
        gizmoChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        renderPrepared: new signals.Signal(),
        commandStarted: new signals.Signal(),
        commandEnded: new signals.Signal(),
        keybindingsRegistered: new signals.Signal(),
        keybindingsCleared: new signals.Signal(),
        hovered: new signals.Signal(),
        historyChanged: new signals.Signal(),
        contoursChanged: new signals.Signal(),
        creatorChanged: new signals.Signal(),
        dialogAdded: new signals.Signal(),
        dialogRemoved: new signals.Signal(),
    }

    readonly materials: MaterialDatabase = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals);
    readonly db = new GeometryDatabase(this.materials, this.signals);
    readonly sprites = new SpriteDatabase();
    readonly snaps = new SnapManager(this.db, this.sprites, this.signals);
    readonly registry = new CommandRegistry();
    readonly keymaps = new KeymapManager();
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null }); // FIXME viewRegistry shouldn't be null
    readonly selection = new SelectionManager(this.db, this.materials, this.signals);
    readonly helpers: Helpers = new Helpers(this.signals);
    readonly scene = new THREE.Scene();
    readonly selectionInteraction = new SelectionInteractionManager(this.selection, this.materials, this.signals);
    readonly selectionGizmo = new SelectionCommandManager(this);
    readonly contours = new ContourManager(this, this.signals);
    readonly originator = new EditorOriginator(this.db, this.selection, this.snaps);
    readonly history = new History(this.originator, this.signals);
    readonly transactoins = new Transactions(this.db, this.signals);
    readonly executor = new CommandExecutor(this.selectionGizmo, this.registry, this.signals, this.originator, this.history, this.selection);

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
        document.addEventListener('keydown', event => {
            this.keymaps.handleKeyboardEvent(event);
        });
        document.addEventListener('contextmenu', event => {
            // FIXME need to map ctrlKey->ctrl and fix the incorrect types.
            // @ts-expect-error
            this.keymaps.handleKeyboardEvent(KeymapManager.buildKeydownEvent('mouse2', event));
        })

        // FIXME disappearing
        const axes = new THREE.AxesHelper(10000);
        axes.renderOrder = 0;
        const material = axes.material as THREE.Material;
        material.depthFunc = THREE.AlwaysDepth;
        this.scene.add(axes);
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
