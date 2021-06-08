import KeymapManager from "atom-keymap";
import { CompositeDisposable, Disposable } from "event-kit";
import signals from "signals";
import * as THREE from "three";
import c3d from '../../../build/Release/c3d.node';
import Command from './commands/Command';
import ContourManager from './commands/ContourManager';
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
import { Cancel } from "./util/Cancellable";
import { Helpers } from "./util/Helpers";
import * as visual from './VisualModel';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<visual.Item>;
    objectRemoved: signals.Signal<visual.Item>;
    objectSelected: signals.Signal<visual.SpaceItem | visual.TopologyItem>;
    objectDeselected: signals.Signal<visual.SpaceItem | visual.TopologyItem>;
    objectHovered: signals.Signal<visual.SpaceItem | visual.TopologyItem>
    objectUnhovered: signals.Signal<visual.SpaceItem | visual.TopologyItem>
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
    hovered: signals.Signal<THREE.Intersection[]>;
    historyChanged: signals.Signal;
    contoursChanged: signals.Signal;
    creatorChanged: signals.Signal<{ creator: c3d.Creator, item: visual.Item }>;
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
        hovered: new signals.Signal(),
        historyChanged: new signals.Signal(),
        contoursChanged: new signals.Signal(),
        creatorChanged: new signals.Signal(),
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
    readonly selectionInteraction = new SelectionInteractionManager(this.selection, this.materials, this.signals);
    readonly selectionGizmo = new SelectionCommandManager(this);
    readonly contours = new ContourManager(this, this.signals);
    readonly originator = new EditorOriginator(this.db, this.selection, this.snaps);
    readonly history = new History(this.originator, this.signals);
    readonly transactoins = new Transactions(this.db, this.signals);

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
            console.log(event);
        });
        document.addEventListener('contextmenu', event => {
            // FIXME need to map ctrlKey->ctrl and fix the incorrect types.
            // @ts-expect-error
            this.keymaps.handleKeyboardEvent(KeymapManager.buildKeydownEvent('mouse2', event));
        })

        const axes = new THREE.AxesHelper(10000);
        axes.renderOrder = 0;
        const material = axes.material as THREE.Material;
        material.depthFunc = THREE.AlwaysDepth;
        this.db.scene.add(axes);
        this.db.scene.background = new THREE.Color(0x424242);

        const d = this.registry.add("ispace-workspace", {
            'undo': () => this.history.undo(),
            'redo': () => this.history.redo()
        });
        this.disposable.add(d);
    }

    private active?: Command;
    private next?: Command;

    // Cancel any active commands and "enqueue" another.
    // Ensure commands are executed ATOMICALLY.
    // Do not start a new command until the previous is fully completed,
    // including any cancelation cleanup. (await this.execute(next))
    async enqueue(command: Command) {
        const active = this.active;
        this.next = command;
        if (active) active.cancel();
        else await this.dequeue();
    }

    private async dequeue() {
        if (!this.next) throw new Error("Invalid precondition");

        let next!: Command;
        while (this.next) {
            next = this.next;
            if (this.active) throw new Error("invalid precondition");
            this.active = next;
            this.next = undefined;
            try {
                await this.execute(next);
            } finally {
                this.active = undefined;
            }
        }

        const command = this.selectionGizmo.commandFor(next);
        if (command) this.enqueue(command);
    }

    private async execute(command: Command) {
        const disposable = this.registry.add('ispace-viewport', {
            'command:finish': () => command.finish(),
            'command:abort': () => command.cancel(),
        });
        try {
            const state = this.originator.saveToMemento(new Map());
            let selectionChanged = false;
            this.signals.objectSelected.addOnce(() => selectionChanged = true);
            this.signals.objectDeselected.addOnce(() => selectionChanged = true);
            await command.execute();
            if (selectionChanged) this.signals.selectionChanged.dispatch({ selection: this.selection });
            this.history.add("Command", state);
        } catch (e) {
            if (e !== Cancel) throw e;
        } finally {
            disposable.dispose();
        }
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.signals.windowLoaded.dispatch();
    }
}
