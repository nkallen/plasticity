import signals from "signals";
import c3d from '../build/Release/c3d.node';
import { AbstractDialog } from "../command/AbstractDialog";
import Command from '../command/Command';
import { PointPickerModel } from "../command/point-picker/PointPickerModel";
import { Viewport } from '../components/viewport/Viewport';
import { SelectionDelta } from "../selection/ChangeSelectionExecutor";
import { Selectable } from '../selection/SelectionDatabase';
import { SelectionModeSet } from "../selection/SelectionModeSet";
import * as visual from '../visual_model/VisualModel';
import { Agent } from "./DatabaseLike";
import { Replacement } from "./GeometryDatabase";
import { Group } from "./Group";
import { NodeItem } from "./Nodes";
import { ConstructionPlane } from "./snaps/ConstructionPlaneSnap";
import { Snap } from "./snaps/Snap";
import { DisablableType } from "./TypeManager";

export class EditorSignals {
    objectAdded: signals.Signal<[visual.Item, Agent]> = new signals.Signal();
    objectRemoved: signals.Signal<[visual.Item, Agent]> = new signals.Signal();
    objectReplaced: signals.Signal<Replacement> = new signals.Signal();
    objectHidden: signals.Signal<NodeItem> = new signals.Signal();
    objectUnhidden: signals.Signal<NodeItem> = new signals.Signal();
    objectSelectable: signals.Signal<NodeItem> = new signals.Signal();
    objectUnselectable: signals.Signal<NodeItem> = new signals.Signal();
    objectSelected: signals.Signal<Selectable> = new signals.Signal();
    objectDeselected: signals.Signal<Selectable> = new signals.Signal();
    objectHovered: signals.Signal<Selectable> = new signals.Signal();
    objectUnhovered: signals.Signal<Selectable> = new signals.Signal();
    selectionChanged: signals.Signal = new signals.Signal();
    selectionDelta: signals.Signal<SelectionDelta> = new signals.Signal();
    hoverDelta: signals.Signal<SelectionDelta> = new signals.Signal();
    groupCreated: signals.Signal<Group> = new signals.Signal();
    groupChanged: signals.Signal<Group> = new signals.Signal();
    sceneGraphChanged: signals.Signal = new signals.Signal();
    temporaryObjectAdded: signals.Signal<{ view: visual.Item, ancestor?: visual.Item }> = new signals.Signal();
    modifiersLoaded: signals.Signal = new signals.Signal();
    snapped: signals.Signal<{ position: Readonly<THREE.Vector3>, names: readonly string[] } | undefined> = new signals.Signal();
    factoryUpdated: signals.Signal = new signals.Signal();
    factoryUpdateFailed: signals.Signal<any> = new signals.Signal();
    factoryCommitted: signals.Signal = new signals.Signal();
    factoryCancelled: signals.Signal = new signals.Signal();
    pointPickerChanged: signals.Signal = new signals.Signal();
    gizmoChanged: signals.Signal = new signals.Signal();
    quasimodeChanged: signals.Signal = new signals.Signal();
    windowResized: signals.Signal = new signals.Signal();
    windowLoaded: signals.Signal = new signals.Signal();
    renderPrepared: signals.Signal<{ camera: THREE.Camera, resolution: THREE.Vector2 }> = new signals.Signal();
    commandStarted: signals.Signal<Command> = new signals.Signal();
    commandFinishedSuccessfully: signals.Signal<Command> = new signals.Signal();
    commandEnded: signals.Signal<Command> = new signals.Signal();
    keybindingsRegistered: signals.Signal<string[]> = new signals.Signal();
    keybindingsCleared: signals.Signal<string[]> = new signals.Signal();
    hovered: signals.Signal<THREE.Intersection[]> = new signals.Signal();
    historyChanged: signals.Signal = new signals.Signal();
    historyAdded: signals.Signal = new signals.Signal();
    backupLoaded: signals.Signal = new signals.Signal();
    contoursChanged: signals.Signal<visual.SpaceInstance<visual.Curve3D>> = new signals.Signal();
    creatorChanged: signals.Signal<{ creator: c3d.Creator, item: visual.Item }> = new signals.Signal();
    dialogAdded: signals.Signal<AbstractDialog<any>> = new signals.Signal();
    dialogRemoved: signals.Signal = new signals.Signal();
    viewportActivated: signals.Signal<Viewport> = new signals.Signal();
    moduleReloaded: signals.Signal = new signals.Signal();
    selectionModeChanged: signals.Signal<SelectionModeSet> = new signals.Signal();
    temporaryConstructionPlaneAdded: signals.Signal<ConstructionPlane> = new signals.Signal();
    constructionPlanesChanged: signals.Signal = new signals.Signal();
    snapsAdded: signals.Signal<{pointPicker: PointPickerModel, snaps: Snap[]}> = new signals.Signal();
    snapsCleared: signals.Signal<Snap[]> = new signals.Signal();
    snapsDisabled: signals.Signal = new signals.Signal();
    snapsEnabled: signals.Signal = new signals.Signal();
    clipboardChanged: signals.Signal = new signals.Signal();
    typeDisabled: signals.Signal<DisablableType> = new signals.Signal();
    typeEnabled: signals.Signal<DisablableType> = new signals.Signal();
    visibleLayersChanged: signals.Signal = new signals.Signal();
    itemMaterialChanged: signals.Signal<NodeItem> = new signals.Signal();
}