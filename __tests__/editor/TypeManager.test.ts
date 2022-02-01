import * as visual from '../../src/visual_model/VisualModel';
import * as THREE from "three";
import { EditorSignals } from '../../src/editor/EditorSignals';
import { TypeManager } from '../../src/editor/TypeManager';
import { ConstructionPlaneSnap } from '../../src/editor/snaps/ConstructionPlaneSnap';
import '../matchers';

let types: TypeManager;
let signals: EditorSignals;

beforeEach(async () => {
    signals = new EditorSignals();
    types = new TypeManager(signals);
});

test("enable & disable", () => {
    expect(types.isEnabled(visual.Solid)).toBe(true);
    types.disable(visual.Solid);
    expect(types.isEnabled(visual.Solid)).toBe(false);
    types.enable(visual.Solid);
    expect(types.isEnabled(visual.Solid)).toBe(true);
});
