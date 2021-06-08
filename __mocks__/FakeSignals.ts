import signals from "signals";
import { EditorSignals } from '../src/Editor';

export default (): EditorSignals => {
    return {
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
        hovered: new signals.Signal(),
        historyChanged: new signals.Signal(),
        selectionChanged: new signals.Signal(),
        contoursChanged: new signals.Signal(),
        creatorChanged: new signals.Signal(),
    }
}