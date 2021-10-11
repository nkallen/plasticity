import * as THREE from 'three';
import * as visual from '../src/editor/VisualModel';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { GizmoMaterialDatabase } from '../src/commands/GizmoMaterials';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { EditorOriginator } from '../src/editor/History';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import ModifierManager, { ModifierStack } from '../src/editor/ModifierManager';
import { PlanarCurveDatabase } from '../src/editor/curves/PlanarCurveDatabase';
import { SnapManager } from '../src/editor/snaps/SnapManager';
import { Selection, SelectionManager } from '../src/selection/SelectionManager';
import { FakeMaterials } from "../__mocks__/FakeMaterials";
import './matchers';
import { SymmetryFactory } from '../src/commands/mirror/MirrorFactory';
import ContourManager from '../src/editor/curves/ContourManager';
import { RegionManager } from '../src/editor/curves/RegionManager';

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
    let contours: ContourManager;
    let selection: SelectionManager;
    let regions: RegionManager;

    beforeEach(() => {
        materials = new FakeMaterials();
        signals = new EditorSignals();
        db = new GeometryDatabase(materials, signals);
        gizmos = new GizmoMaterialDatabase(signals);
        snaps = new SnapManager(db, signals);
        selection = new SelectionManager(db, materials, signals);
        selected = selection.selected;
        curves = new PlanarCurveDatabase(db, materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        const regions = new RegionManager(db, curves);
        contours = new ContourManager(db, curves, regions, signals);
        originator = new EditorOriginator(db, selected, snaps, curves, contours, modifiers);
    });

    let box: visual.Solid;
    let stack: ModifierStack;

    beforeEach(async () => {
        const makeBox = new ThreePointBoxFactory(modifiers, materials, signals);
        makeBox.p1 = new THREE.Vector3();
        makeBox.p2 = new THREE.Vector3(1, 0, 0);
        makeBox.p3 = new THREE.Vector3(1, 1, 0);
        makeBox.p4 = new THREE.Vector3(1, 1, 1);
        box = await makeBox.commit() as visual.Solid;

        stack = modifiers.add(box, SymmetryFactory).stack;
        await modifiers.rebuild(stack);
    });

    test("saveToMemento & restoreFromMemento", () => {
        const memento = originator.saveToMemento();

        db = new GeometryDatabase(materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, curves, contours, modifiers);

        originator.restoreFromMemento(memento);
        expect(1).toBe(1);
    });

    test("serialize & deserialize", async () => {
        const data = await originator.serialize();

        db = new GeometryDatabase(materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, curves, contours, modifiers);

        await originator.deserialize(data);
        expect(1).toBe(1);
    })
})