/**
 * @jest-environment jsdom
 */
import * as THREE from "three";
import { CenterCircleFactory } from "../src/commands/circle/CircleFactory";
import { ObjectPicker } from "../src/commands/ObjectPicker";
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import * as visual from '../src/visual_model/VisualModel';
import { SelectionInteractionManager } from "../src/selection/SelectionInteraction";
import { SelectionManager } from "../src/selection/SelectionManager";
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

let db: GeometryDatabase;
let materials: Required<MaterialDatabase>;
let signals: EditorSignals;
let makeCircle: CenterCircleFactory;
let interaction: SelectionInteractionManager;
let selection: SelectionManager;

beforeEach(() => {
    materials = new FakeMaterials();
    signals = new EditorSignals();
    db = new GeometryDatabase(materials, signals);
    makeCircle = new CenterCircleFactory(db, materials, signals);
    selection = new SelectionManager(db, materials, signals);
    interaction = new SelectionInteractionManager(selection, materials, signals);
})

test("selecting, deleting, then deselectAll works", async () => {
    makeCircle.center = new THREE.Vector3();
    makeCircle.radius = 1;
    const item = await makeCircle.commit() as visual.SpaceInstance<visual.Curve3D>;

    const objectPicker = new ObjectPicker({
        db,
        viewports: [],
        signals,
        materials,
        selectionInteraction: interaction,
    });
    const promise = objectPicker.execute(() => {});

    interaction.onClick([{ object: item.underlying, point: new THREE.Vector3(), distance: 0 }]);
    expect(selection.selected.curves.size).toBe(1);

    await db.removeItem(item);

    expect(selection.selected.curves.size).toBe(0);

    promise.finish();

    selection.selected.removeAll();

    expect(selection.selected.curves.size).toBe(0);
});
