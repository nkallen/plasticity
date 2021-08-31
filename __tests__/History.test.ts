import { GizmoMaterialDatabase } from '../src/commands/GizmoMaterials';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { EditorOriginator } from '../src/editor/History';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import ModifierManager from '../src/editor/ModifierManager';
import { PlanarCurveDatabase } from '../src/editor/PlanarCurveDatabase';
import { SnapManager } from '../src/editor/SnapManager';
import { Selection, SelectionManager } from '../src/selection/SelectionManager';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';

describe(EditorOriginator, () => {
    let db: GeometryDatabase;
    let materials: MaterialDatabase;
    let signals: EditorSignals;
    let snaps: SnapManager;
    let selected: Selection;
    let gizmos: GizmoMaterialDatabase;
    let originator: EditorOriginator;
    let curves: PlanarCurveDatabase;
    let modifiers: ModifierManager;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
        gizmos = new GizmoMaterialDatabase(signals);
        snaps = new SnapManager(db, gizmos, signals);
        const selection = new SelectionManager(db, materials, signals);
        selected = selection.selected;
        curves = new PlanarCurveDatabase(db);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, curves, modifiers);
    });

    test("saveToMemento & restoreFromMemento", () => {
        const memento = originator.saveToMemento();
        originator.restoreFromMemento(memento);
        expect(1).toBe(1);
    });
})