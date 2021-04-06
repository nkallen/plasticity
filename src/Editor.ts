import signals from "signals";
import * as THREE from "three";
import Command from './commands/Command';
import { GeometryDatabase } from "./GeometryDatabase";
import { BasicMaterialDatabase } from "./MaterialDatabase";
import { SelectionManager } from './selection/SelectionManager';
import { SnapManager } from './SnapManager';
import { SpriteDatabase } from "./SpriteDatabase";
import { Viewport } from "./Viewport";
import { SpaceItem } from './VisualModel';

THREE.Object3D.DefaultUp = new THREE.Vector3(0, 0, 1);

export interface EditorSignals {
    objectAdded: signals.Signal<SpaceItem>;
    objectRemoved: signals.Signal<SpaceItem>;
    objectSelected: signals.Signal<SpaceItem>;
    objectDeselected: signals.Signal<SpaceItem>;
    objectHovered: signals.Signal<SpaceItem>
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
    readonly selectionManager = new SelectionManager(this);
    readonly spriteDatabase = new SpriteDatabase();
    readonly snapManager = new SnapManager(this.db, this.spriteDatabase, this.signals);

    constructor() {
        // FIXME dispose of these:
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        window.addEventListener('load', this.onWindowLoad.bind(this), false);

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
