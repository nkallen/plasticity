import * as visual from './VisualModel';
import signals from "signals";
import { HasSelection } from '../selection/SelectionManager';
import Command from '../commands/Command';
import { AbstractDialog } from "../commands/AbstractDialog";
import c3d from '../build/Release/c3d.node';
import { Viewport } from '../components/viewport/Viewport';
import { Agent } from './GeometryDatabase';

export class EditorSignals {
    objectAdded: signals.Signal<[visual.Item, Agent]> = new signals.Signal();
    objectRemoved: signals.Signal<[visual.Item, Agent]> = new signals.Signal();
    objectSelected: signals.Signal<visual.Selectable> = new signals.Signal();
    objectDeselected: signals.Signal<visual.Selectable> = new signals.Signal();
    objectHovered: signals.Signal<visual.Selectable> = new signals.Signal();
    objectUnhovered: signals.Signal<visual.Selectable> = new signals.Signal();
    selectionChanged: signals.Signal<{ selection: HasSelection, point?: THREE.Vector3 }> = new signals.Signal();
    sceneGraphChanged: signals.Signal = new signals.Signal();
    factoryUpdated: signals.Signal = new signals.Signal();
    factoryCommitted: signals.Signal = new signals.Signal();
    factoryCancelled: signals.Signal = new signals.Signal();
    pointPickerChanged: signals.Signal = new signals.Signal();
    gizmoChanged: signals.Signal = new signals.Signal();
    windowResized: signals.Signal = new signals.Signal();
    windowLoaded: signals.Signal = new signals.Signal();
    renderPrepared: signals.Signal<{ camera: THREE.Camera, resolution: THREE.Vector2 }> = new signals.Signal();
    commandStarted: signals.Signal<Command> = new signals.Signal();
    commandEnded: signals.Signal = new signals.Signal();
    keybindingsRegistered: signals.Signal<string[]> = new signals.Signal();
    keybindingsCleared: signals.Signal<string[]> = new signals.Signal();
    hovered: signals.Signal<THREE.Intersection[]> = new signals.Signal();
    historyChanged: signals.Signal = new signals.Signal();
    contoursChanged: signals.Signal<visual.SpaceInstance<visual.Curve3D>> = new signals.Signal();
    creatorChanged: signals.Signal<{ creator: c3d.Creator, item: visual.Item }> = new signals.Signal();
    dialogAdded: signals.Signal<AbstractDialog<any>> = new signals.Signal();
    dialogRemoved: signals.Signal = new signals.Signal();
    viewportActivated: signals.Signal<Viewport> = new signals.Signal();
}