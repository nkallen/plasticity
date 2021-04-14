import KeymapManager from "atom-keymap";
import signals from "signals";
import * as THREE from "three";
import CommandRegistry from "./CommandRegistry";
import Command from './commands/Command';
import { GeometryDatabase } from "./GeometryDatabase";
import { Helpers } from "./Helpers";
import { BasicMaterialDatabase } from "./MaterialDatabase";
import { SelectionManager } from './selection/SelectionManager';
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";
import { Viewport } from "./Viewport";
import { SpaceItem, TopologyItem } from './VisualModel';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<SpaceItem>;
    objectRemoved: signals.Signal<SpaceItem>;
    objectSelected: signals.Signal<SpaceItem | TopologyItem>;
    objectDeselected: signals.Signal<SpaceItem | TopologyItem>;
    objectHovered: signals.Signal<SpaceItem | TopologyItem>
    sceneGraphChanged: signals.Signal;
    factoryUpdated: signals.Signal;
    factoryCommitted: signals.Signal;
    pointPickerChanged: signals.Signal;
    windowResized: signals.Signal;
    windowLoaded: signals.Signal;
    rendererAdded: signals.Signal<THREE.Renderer>;
}

export class Editor {
    readonly viewports: Viewport[] = [];

    readonly signals: EditorSignals = {
        objectAdded: new signals.Signal(),
        objectRemoved: new signals.Signal(),
        objectSelected: new signals.Signal(),
        objectDeselected: new signals.Signal(),
        objectHovered: new signals.Signal(),
        sceneGraphChanged: new signals.Signal(),
        factoryUpdated: new signals.Signal(),
        factoryCommitted: new signals.Signal(),
        pointPickerChanged: new signals.Signal(),
        windowResized: new signals.Signal(),
        windowLoaded: new signals.Signal(),
        rendererAdded: new signals.Signal()
    }

    readonly materials = new BasicMaterialDatabase();
    readonly db = new GeometryDatabase(this.materials, this.signals);
    readonly selection = new SelectionManager(this.db, this.materials, this.signals)
    readonly sprites = new SpriteDatabase();
    readonly snaps = new SnapManager(this.db, this.sprites);
    readonly registry = new CommandRegistry();
    readonly keymaps = new KeymapManager();
    readonly helpers = new Helpers();

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
        
        this.signals.objectAdded.add(item => this.snaps.add(item));
        this.signals.objectRemoved.add(item => this.snaps.delete(item));
        this.signals.objectRemoved.add(item => this.selection.delete(item));

        const axes = new THREE.AxesHelper(10000);
        axes.renderOrder = 0;
        const material = axes.material as THREE.Material;
        material.depthFunc = THREE.AlwaysDepth;
        this.db.scene.add(axes);
        this.db.scene.background = new THREE.Color(0x424242);
    }

    execute(command: Command) {
        command.execute();
    }

    onWindowResize() {
        this.signals.windowResized.dispatch();
    }

    onWindowLoad() {
        this.signals.windowLoaded.dispatch();
    }
}
