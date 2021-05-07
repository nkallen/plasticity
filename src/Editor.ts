import KeymapManager from "atom-keymap";
import signals from "signals";
import * as THREE from "three";
import { Cancel } from "./util/Cancellable";
import CommandRegistry from "./components/atom/CommandRegistry";
import Command from './commands/Command';
import { GizmoMaterialDatabase } from "./commands/GizmoMaterials";
import { GeometryDatabase } from "./GeometryDatabase";
import { Helpers } from "./util/Helpers";
import MaterialDatabase, { BasicMaterialDatabase } from "./MaterialDatabase";
import { SelectionManager } from './selection/SelectionManager';
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";
import TooltipManager from "./components/atom/tooltip-manager";
import { Viewport } from "./components/viewport/Viewport";
import { SpaceItem, TopologyItem } from './VisualModel';
import { Memento } from "./History";

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<SpaceItem>;
    objectRemoved: signals.Signal<SpaceItem>;
    objectSelected: signals.Signal<SpaceItem | TopologyItem>;
    objectDeselected: signals.Signal<SpaceItem | TopologyItem>;
    objectHovered: signals.Signal<SpaceItem | TopologyItem>
    objectUnhovered: signals.Signal<SpaceItem | TopologyItem>
    sceneGraphChanged: signals.Signal;
    factoryUpdated: signals.Signal;
    factoryCommitted: signals.Signal;
    pointPickerChanged: signals.Signal;
    gizmoChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    renderPrepared: signals.Signal<[THREE.Camera, THREE.Vector2]>;
    commandStarted: signals.Signal<Command>;
    commandEnded: signals.Signal;
    keybindingsRegistered: signals.Signal<string[]>;
    clicked: signals.Signal<THREE.Intersection[]>;
    hovered: signals.Signal<THREE.Intersection[]>;
}

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        objectRemoved: new signals.Signal(),
        objectSelected: new signals.Signal(),
        objectDeselected: new signals.Signal(),
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
        clicked: new signals.Signal(),
        hovered: new signals.Signal(),
    }

    readonly materials: MaterialDatabase = new BasicMaterialDatabase(this.signals);
    readonly gizmos = new GizmoMaterialDatabase(this.signals);
    readonly db = new GeometryDatabase(this.materials, this.signals);
    readonly selection = new SelectionManager(this.db, this.materials, this.signals)
    readonly sprites = new SpriteDatabase();
    readonly snaps = new SnapManager(this.db, this.sprites, this.signals);
    readonly registry = new CommandRegistry();
    readonly keymaps = new KeymapManager();
    readonly helpers = new Helpers(this.signals);
    readonly tooltips = new TooltipManager({ keymapManager: this.keymaps, viewRegistry: null}); // FIXME viewRegistry shouldn't be null
  
    constructor() {
        // FIXME dispose of these:
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);
        this.registry.attach(window);
        this.keymaps.defaultTarget = document.body;
        document.addEventListener('keydown', event => {
            this.keymaps.handleKeyboardEvent(event);
            console.log(event);
        });

        const axes = new THREE.AxesHelper(10000);
        axes.renderOrder = 0;
        const material = axes.material as THREE.Material;
        material.depthFunc = THREE.AlwaysDepth;
        this.db.scene.add(axes);
        this.db.scene.background = new THREE.Color(0x424242);
    }

    async execute(command: Command) {
        this.signals.commandStarted.dispatch(command);
        const disposable = this.registry.add('ispace-viewport', {
            'command:finish': () => command.finish(),
            'command:abort': () => command.cancel(),
        })
        try {
            await command.execute();
        } catch (e) {
            if (e !== Cancel) throw e;
        } finally {
            disposable.dispose();
            this.signals.commandEnded.dispatch();
        }
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.signals.windowLoaded.dispatch();
    }

    saveToMemento(registry: Map<any, any>): Memento {
        return new Memento(this.db.saveToMemento(registry), this.selection.saveToMemento(registry), this.snaps.saveToMemento(registry));
    }

    restoreFromMemento(m: Memento) {

    }
}
