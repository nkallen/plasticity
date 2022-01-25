/**
 * @jest-environment jsdom
 */
import * as THREE from 'three';
import { GizmoMaterialDatabase } from '../src/command/GizmoMaterials';
import { ThreePointBoxFactory } from '../src/commands/box/BoxFactory';
import { SymmetryFactory } from '../src/commands/mirror/MirrorFactory';
import { Viewport } from '../src/components/viewport/Viewport';
import ContourManager from '../src/editor/curves/ContourManager';
import { CrossPointDatabase } from '../src/editor/curves/CrossPointDatabase';
import { PlanarCurveDatabase } from '../src/editor/curves/PlanarCurveDatabase';
import { History } from '../src/editor/History';
import { Editor } from '../src/editor/Editor';
import { EditorSignals } from '../src/editor/EditorSignals';
import { GeometryDatabase } from '../src/editor/GeometryDatabase';
import { CameraMemento, ConstructionPlaneMemento, EditorOriginator, ViewportMemento } from '../src/editor/History';
import MaterialDatabase from '../src/editor/MaterialDatabase';
import { ParallelMeshCreator } from '../src/editor/MeshCreator';
import ModifierManager, { ModifierStack } from '../src/editor/ModifierManager';
import { SnapManager } from '../src/editor/snaps/SnapManager';
import { Selection, SelectionDatabase } from '../src/selection/SelectionDatabase';
import * as visual from '../src/visual_model/VisualModel';
import { MakeViewport } from '../__mocks__/FakeViewport';
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
    let contours: ContourManager;
    let selection: SelectionDatabase;
    let crosses: CrossPointDatabase;
    let viewports: Viewport[];
    let history: History;

    beforeEach(() => {
        const editor = new Editor();
        history = editor.history;
        materials = editor.materials;
        signals = editor.signals;
        db = editor._db;
        gizmos = editor.gizmos;
        crosses = editor.crosses;
        snaps = editor.snaps;
        selection = editor._selection;
        selected = selection.selected;
        curves = editor.curves;
        modifiers = editor.modifiers;
        contours = editor.contours;
        viewports = [MakeViewport(editor)];
        originator = new EditorOriginator(db, selected, snaps, crosses, curves, contours, modifiers, viewports);
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

        db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, crosses, curves, contours, modifiers, viewports);

        originator.restoreFromMemento(memento);
        expect(1).toBe(1);
    });

    test("undo & redo", async () => {
        history.add("Initial", originator.saveToMemento());
        expect(db.visibleObjects.length).toBe(2);
        await db.removeItem(box);
        expect(db.visibleObjects.length).toBe(1);
        history.undo();
        expect(db.visibleObjects.length).toBe(2);
        history.redo();
        expect(db.visibleObjects.length).toBe(2);
    })

    test("serialize & deserialize", async () => {
        const data = await originator.serialize();

        db = new GeometryDatabase(new ParallelMeshCreator(), materials, signals);
        modifiers = new ModifierManager(db, selection, materials, signals);
        originator = new EditorOriginator(db, selected, snaps, crosses, curves, contours, modifiers, viewports);

        await originator.deserialize(data);
        expect(1).toBe(1);
    })

    describe(CameraMemento, () => {
        test("toJSON & fromJSON", () => {
            const memento = viewports[0].camera.saveToMemento();
            const memento2 = CameraMemento.fromJSON(memento.toJSON());
            expect(memento.position).toApproximatelyEqual(memento2.position);
        })
    });

    describe(ConstructionPlaneMemento, () => {
        test("toJSON & fromJSON", () => {
            const memento = viewports[0].saveToMemento().constructionPlane;
            const memento2 = ConstructionPlaneMemento.fromJSON(memento.toJSON());
            expect(memento.n).toApproximatelyEqual(memento2.n);
        })
    });

    describe(ViewportMemento, () => {
        test("serialize & deserialize", () => {
            const memento = viewports[0].saveToMemento();
            const data = memento.serialize();
            const memento2 = ViewportMemento.deserialize(data);
            expect(memento.constructionPlane.n).toApproximatelyEqual(memento2.constructionPlane.n);
            expect(memento.camera.position).toApproximatelyEqual(memento2.camera.position);
        })
    });
})