import signals from "signals";
import { EditorSignals } from '../src/Editor';

export default () => {
    return {
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
    } as EditorSignals
}